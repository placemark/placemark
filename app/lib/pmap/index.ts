import mapboxgl from "mapbox-gl";
import loadAndAugmentStyle, {
  FEATURES_SOURCE_NAME,
  EPHEMERAL_SOURCE_NAME,
} from "app/lib/load_and_augment_style";
import type {
  EphemeralEditingState,
  Sel,
  Data,
  PreviewProperty,
} from "state/jotai";
import {
  CURSOR_DEFAULT,
  DEFAULT_MAP_BOUNDS,
  emptySelection,
  LASSO_YELLOW,
  LASSO_DARK_YELLOW,
  LINE_COLORS_SELECTED_RGB,
  WHITE,
  DECK_SYNTHETIC_ID,
  DECK_LASSO_ID,
} from "app/lib/constants";
import { splitFeatureGroups } from "app/lib/pmap/split_feature_groups";
import type {
  Feature,
  IPresence,
  IFeatureCollection,
  ISymbolization,
  LayerConfigMap,
  IFeature,
  Point,
} from "types";
import { makeRectangle } from "app/lib/pmap/merge_ephemeral_state";
import { colorFromPresence } from "app/lib/color";
import type { Presence } from "@prisma/client";
import { IDMap } from "app/lib/id_mapper";
import { shallowArrayEqual } from "app/lib/utils";
import { MapboxOverlay } from "@deck.gl/mapbox/typed";
import { PolygonLayer, ScatterplotLayer } from "@deck.gl/layers/typed";

const MAP_OPTIONS: Omit<mapboxgl.MapboxOptions, "container"> = {
  style: { version: 8, layers: [], sources: {} },
  boxZoom: false,
  dragRotate: false,
  attributionControl: false,
  fadeDuration: 0,
};

const cursorSvg = (color: string) => {
  const div = document.createElement("div");
  div.style.color = color;
  div.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7 17L1 1L17 7L10 10L7 17Z" stroke="white" fill="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
</svg>
`;
  return div;
};

type ClickEvent = mapboxgl.MapMouseEvent & mapboxgl.EventData;
type MoveEvent = mapboxgl.MapboxEvent & mapboxgl.EventData;

export type PMapHandlers = {
  onClick: (e: ClickEvent) => void;
  onDoubleClick: (e: ClickEvent) => void;
  onMapMouseUp: (e: mapboxgl.MapMouseEvent) => void;
  onMapMouseMove: (e: mapboxgl.MapMouseEvent) => void;
  onMapTouchMove: (e: mapboxgl.MapTouchEvent) => void;
  onMapMouseDown: (e: mapboxgl.MapMouseEvent) => void;
  onMapTouchStart: (e: mapboxgl.MapTouchEvent) => void;
  onMoveEnd: (e: mapboxgl.MapboxEvent & mapboxgl.EventData) => void;
  onMapTouchEnd: (e: mapboxgl.MapTouchEvent) => void;
  onMove: (e: mapboxgl.MapboxEvent & mapboxgl.EventData) => void;
};

const lastValues = new WeakMap<mapboxgl.GeoJSONSource, Feature[]>();

/**
 * Memoized set data for a mapboxgl.GeoJSONSource. If
 * the same source is called with the same data,
 * it won't set.
 */
function mSetData(
  source: mapboxgl.GeoJSONSource,
  newData: Feature[],
  _label: string,
  force?: boolean
) {
  if (!shallowArrayEqual(lastValues.get(source), newData) || force) {
    source.setData({
      type: "FeatureCollection",
      features: newData,
    } as IFeatureCollection);
    lastValues.set(source, newData);
  } else {
    // console.log(
    //   "Skipped update",
    //   _label,
    //   source,
    //   newData,
    //   lastValues.get(source)
    // );
  }
}

export default class PMap {
  map: mapboxgl.Map;
  handlers: React.MutableRefObject<PMapHandlers>;
  idMap: IDMap;

  lastSelection: Sel;
  lastSelectionIds: Set<RawId>;
  lastData: Data | null;
  lastEphemeralState: EphemeralEditingState;
  lastSymbolization: ISymbolization | null;
  presenceMarkers: Map<IPresence["userId"], mapboxgl.Marker>;
  lastLayer: LayerConfigMap | null;
  lastPreviewProperty: PreviewProperty;
  overlay: MapboxOverlay;

  constructor({
    element,
    layerConfigs,
    lastPresence,
    handlers,
    previewProperty,
    symbolization,
    idMap,
    controlsCorner = "bottom-left",
  }: {
    element: HTMLDivElement;
    layerConfigs: LayerConfigMap;
    lastPresence: Presence | BBox4 | null;
    handlers: React.MutableRefObject<PMapHandlers>;
    symbolization: ISymbolization;
    previewProperty: PreviewProperty;
    idMap: IDMap;
    controlsCorner?: Parameters<mapboxgl.Map["addControl"]>[1];
  }) {
    this.idMap = idMap;
    const positionOptions = lastPresence
      ? Array.isArray(lastPresence)
        ? {
            bounds: mapboxgl.LngLatBounds.convert(lastPresence),
            fitBoundsOptions: { padding: 20 },
          }
        : {
            bounds: mapboxgl.LngLatBounds.convert([
              [lastPresence.minx, lastPresence.miny],
              [lastPresence.maxx, lastPresence.maxy],
            ]),
            pitch: lastPresence.pitch,
            bearing: lastPresence.bearing,
          }
      : {
          bounds: DEFAULT_MAP_BOUNDS as mapboxgl.LngLatBoundsLike,
        };

    const map = new mapboxgl.Map({
      container: element,
      ...MAP_OPTIONS,
      ...positionOptions,
    });

    this.overlay = new MapboxOverlay({
      interleaved: true,
      layers: [],
    });

    map.addControl(this.overlay);

    map.addControl(
      new mapboxgl.GeolocateControl({
        showUserLocation: false,
        showAccuracyCircle: false,
        positionOptions: {
          enableHighAccuracy: true,
        },
      }),
      controlsCorner
    );
    map.addControl(new mapboxgl.NavigationControl({}), controlsCorner);
    map.addControl(
      new mapboxgl.AttributionControl({
        compact: true,
      })
    );
    map.getCanvas().style.cursor = CURSOR_DEFAULT;
    map.on("click", this.onClick);
    map.on("mousedown", this.onMapMouseDown);
    map.on("mousemove", this.onMapMouseMove);
    map.on("dblclick", this.onMapDoubleClick);
    map.on("mouseup", this.onMapMouseUp);
    map.on("moveend", this.onMoveEnd);
    map.on("touchend", this.onMapTouchEnd);
    map.on("move", this.onMove);

    map.on("touchstart", this.onMapTouchStart);
    map.on("touchmove", this.onMapTouchMove);
    map.on("touchend", this.onMapTouchEnd);

    this.presenceMarkers = new Map();
    this.lastSymbolization = symbolization;

    this.lastSelection = { type: "none" };
    this.lastSelectionIds = emptySelection;
    this.lastData = null;
    this.lastEphemeralState = { type: "none" };
    this.lastLayer = null;
    this.lastPreviewProperty = null;
    this.handlers = handlers;
    this.map = map;
    void this.setStyle({
      layerConfigs,
      symbolization,
      previewProperty: previewProperty,
    });
  }

  /**
   * Handler proxies --------------------------------------
   */
  onClick = (e: LayerScopedEvent) => {
    this.handlers.current.onClick(e);
  };

  onMapMouseDown = (e: LayerScopedEvent) => {
    this.handlers.current.onMapMouseDown(e);
  };

  onMapTouchStart = (e: mapboxgl.MapTouchEvent) => {
    this.handlers.current.onMapTouchStart(e);
  };

  onMapMouseUp = (e: LayerScopedEvent) => {
    this.handlers.current.onMapMouseUp(e);
  };

  onMoveEnd = (e: MoveEvent) => {
    this.handlers.current.onMoveEnd(e);
  };

  onMapTouchEnd = (e: mapboxgl.MapTouchEvent) => {
    this.handlers.current.onMapTouchEnd(e);
  };

  onMove = (e: MoveEvent) => {
    this.handlers.current.onMove(e);
  };

  onMapMouseMove = (e: mapboxgl.MapMouseEvent) => {
    this.handlers.current.onMapMouseMove(e);
  };

  onMapTouchMove = (e: mapboxgl.MapTouchEvent) => {
    this.handlers.current.onMapTouchMove(e);
  };

  onMapDoubleClick = (e: mapboxgl.MapMouseEvent) => {
    this.handlers.current.onDoubleClick(e);
  };

  setPresences(presences: IPresence[]) {
    const ids = new Set(presences.map((p) => p.userId));
    for (const presence of presences) {
      const marker =
        this.presenceMarkers.get(presence.userId) ??
        new mapboxgl.Marker(cursorSvg(colorFromPresence(presence)));
      marker
        .setLngLat([presence.cursorLongitude, presence.cursorLatitude])
        .addTo(this.map);
      this.presenceMarkers.set(presence.userId, marker);
    }
    // Remove stale presences
    for (const [id, marker] of this.presenceMarkers.entries()) {
      if (!ids.has(id)) {
        marker.remove();
        this.presenceMarkers.delete(id);
      }
    }
  }

  /**
   * The central hard method, trying to optimize feature updates
   * on the map.
   */
  setData({
    data,
    ephemeralState,
    force = false,
  }: {
    data: Data;
    ephemeralState: EphemeralEditingState;
    force?: boolean;
  }) {
    if (!(this.map && (this.map as any).style)) {
      this.lastData = data;
      return;
    }

    const featuresSource = this.map.getSource(
      FEATURES_SOURCE_NAME
    ) as mapboxgl.GeoJSONSource;

    const ephemeralSource = this.map.getSource(
      EPHEMERAL_SOURCE_NAME
    ) as mapboxgl.GeoJSONSource;

    if (!featuresSource || !ephemeralSource) {
      // Set the lastFeatureList here
      // so that the setStyle method will
      // add it again. This happens when the map
      // is initially loaded.
      this.lastData = data;
      return;
    }

    const groups = splitFeatureGroups({
      idMap: this.idMap,
      data,
      lastSymbolization: this.lastSymbolization,
      previewProperty: this.lastPreviewProperty,
    });

    // console.log(
    //   "in setData",
    //   JSON.stringify({
    //     newSelection,
    //     outputIds: [...groups.selectionIds],
    //   })
    // );
    // TODO: fix flash
    mSetData(ephemeralSource, groups.ephemeral, "ephem");
    mSetData(featuresSource, groups.features, "features", force);

    this.overlay.setProps({
      layers: [
        new ScatterplotLayer<IFeature<Point>>({
          id: DECK_SYNTHETIC_ID,

          radiusUnits: "pixels",
          lineWidthUnits: "pixels",

          pickable: true,
          stroked: true,
          filled: true,

          data: groups.synthetic,

          getPosition: (d) => d.geometry.coordinates as [number, number],
          getFillColor: (d) => {
            return groups.selectionIds.has(d.id as RawId)
              ? WHITE
              : LINE_COLORS_SELECTED_RGB;
          },
          getLineColor: (d) => {
            return groups.selectionIds.has(d.id as RawId)
              ? LINE_COLORS_SELECTED_RGB
              : WHITE;
          },
          getLineWidth: 1.5,
          getRadius: (d) => {
            const id = Number(d.id || 0);
            const fp = d.properties?.fp;
            if (fp) return 10;
            return id % 2 === 0 ? 5 : 3.5;
          },
        }),

        ephemeralState.type === "lasso" &&
          new PolygonLayer<number[]>({
            id: DECK_LASSO_ID,
            data: [makeRectangle(ephemeralState)],
            visible: ephemeralState.type === "lasso",
            pickable: false,
            stroked: true,
            filled: true,
            lineWidthUnits: "pixels",
            getPolygon: (d) => d,
            getFillColor: LASSO_YELLOW,
            getLineColor: LASSO_DARK_YELLOW,
            getLineWidth: 1,
          }),
      ],
    });

    this.lastData = data;
    this.updateSelections(groups.selectionIds);
    this.lastEphemeralState = ephemeralState;
  }

  remove() {
    this.map.remove();
  }

  // Use { diff: false } to force a style load: otherwise
  // if we switch from a style to itself, we don't get
  // a style.load event.
  async setStyle({
    layerConfigs,
    symbolization,
    previewProperty,
  }: {
    layerConfigs: LayerConfigMap;
    symbolization: ISymbolization;
    previewProperty: PreviewProperty;
  }) {
    if (
      layerConfigs === this.lastLayer &&
      symbolization === this.lastSymbolization &&
      previewProperty === this.lastPreviewProperty
    ) {
      return;
    }
    this.lastLayer = layerConfigs;
    this.lastSymbolization = symbolization;
    this.lastPreviewProperty = previewProperty;
    const style = await loadAndAugmentStyle({
      layerConfigs,
      symbolization,
      previewProperty,
    });
    this.map.setStyle(style);

    await new Promise((resolve) => setTimeout(resolve, 100));

    if (this.lastData) {
      this.setData({
        data: this.lastData,
        ephemeralState: this.lastEphemeralState,
        force: true,
      });
      this.lastSelection = { type: "none" };
    }
  }

  private updateSelections(newSet: Set<RawId>) {
    if (!this.map || !(this.map as any).style) return;
    const oldSet = this.lastSelectionIds;
    const tmpSet = new Set(newSet);
    // let adds = 0;
    // let removes = 0;

    // In new set, but not in old set: add to selection
    for (const id of tmpSet) {
      if (!oldSet.has(id)) {
        // If this selection id is a base feature, make all of its
        // vertexes visible
        this.map.setFeatureState(
          {
            source: FEATURES_SOURCE_NAME,
            id,
          },
          {
            state: "selected",
          }
        );
        tmpSet.delete(id);
        // adds++;
      }
    }

    // In old set, but not in new set: remove from selection
    for (const id of oldSet) {
      if (!tmpSet.has(id)) {
        this.map.removeFeatureState(
          {
            source: FEATURES_SOURCE_NAME,
            id,
          },
          "state"
        );
        // removes++;
      }
    }

    // if (adds || removes) {
    //   console.log("adds", adds, "removes", removes);
    // }

    this.lastSelectionIds = newSet;
  }
}
