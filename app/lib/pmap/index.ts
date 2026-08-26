import { colorFromPresence } from "app/lib/color";
import {
  CURSOR_DEFAULT,
  DEFAULT_MAP_BOUNDS,
  emptySelection,
} from "app/lib/constants";
import type { IDMap } from "app/lib/id_mapper";
import loadAndAugmentStyle, {
  EPHEMERAL_SOURCE_NAME,
  FEATURES_SOURCE_NAME,
  LASSO_SOURCE_NAME,
  SYNTHETIC_SOURCE_NAME,
} from "app/lib/load_and_augment_style";
import { splitFeatureGroups } from "app/lib/pmap/split_feature_groups";
import { routingProvider } from "app/lib/routing";
import { shallowArrayEqual } from "app/lib/utils";
import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type {
  Data,
  EphemeralEditingState,
  PreviewProperty,
  Sel,
} from "state/jotai";
import type {
  Feature,
  IFeatureCollection,
  IPresence,
  ISymbolization,
  LayerConfigMap,
} from "types";
import { bboxToPolygon } from "../geometry";
import { NitpickyAttributionControl } from "./nitpickyAttributionControl";

maplibregl.setWorkerUrl(maplibreWorkerUrl);

const MAP_OPTIONS: Omit<maplibregl.MapOptions, "container"> = {
  style: { version: 8, layers: [], sources: {} },
  maxZoom: 26,
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

type ClickEvent = maplibregl.MapMouseEvent;
type MoveEvent = maplibregl.MapLibreEvent;

export type PMapHandlers = {
  onClick: (e: ClickEvent) => void;
  onDoubleClick: (e: ClickEvent) => void;
  onMapMouseUp: (e: maplibregl.MapMouseEvent) => void;
  onMapMouseMove: (e: maplibregl.MapMouseEvent) => void;
  onMapTouchMove: (e: maplibregl.MapTouchEvent) => void;
  onMapMouseDown: (e: maplibregl.MapMouseEvent) => void;
  onMapTouchStart: (e: maplibregl.MapTouchEvent) => void;
  onMoveEnd: (e: maplibregl.MapLibreEvent) => void;
  onMapTouchEnd: (e: maplibregl.MapTouchEvent) => void;
  onMove: (e: maplibregl.MapLibreEvent) => void;
};

const lastValues = new WeakMap<maplibregl.GeoJSONSource, Feature[]>();

/**
 * Memoized set data for a maplibregl.GeoJSONSource. If
 * the same source is called with the same data,
 * it won't set.
 */
function mSetData(
  source: maplibregl.GeoJSONSource,
  newData: Feature[],
  _label: string,
  force?: boolean,
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
  map: maplibregl.Map;
  handlers: React.RefObject<PMapHandlers>;
  idMap: IDMap;

  lastSelection: Sel;
  lastSelectionIds: Set<RawId>;
  lastData: Data | null;
  lastEphemeralState: EphemeralEditingState;
  lastSymbolization: ISymbolization | null;
  presenceMarkers: Map<IPresence["userId"], maplibregl.Marker>;
  lastLayer: LayerConfigMap | null;
  lastPreviewProperty: PreviewProperty;

  constructor({
    element,
    layerConfigs,
    handlers,
    previewProperty,
    symbolization,
    idMap,
    controlsCorner = "bottom-left",
  }: {
    element: HTMLDivElement;
    layerConfigs: LayerConfigMap;
    handlers: React.RefObject<PMapHandlers>;
    symbolization: ISymbolization;
    previewProperty: PreviewProperty;
    idMap: IDMap;
    controlsCorner?: Parameters<maplibregl.Map["addControl"]>[1];
  }) {
    this.idMap = idMap;
    const positionOptions = {
      bounds: DEFAULT_MAP_BOUNDS as maplibregl.LngLatBoundsLike,
    };

    const map = new maplibregl.Map({
      container: element,
      ...MAP_OPTIONS,
      ...positionOptions,
    });

    map.addControl(
      new maplibregl.GeolocateControl({
        showUserLocation: false,
        showAccuracyCircle: false,
        positionOptions: {
          enableHighAccuracy: true,
        },
      }),
      controlsCorner,
    );
    map.addControl(new maplibregl.NavigationControl({}), controlsCorner);
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: [
          '<a href="/map-style-licenses.html" target="_blank">Style licenses</a>',
          ...(routingProvider ? routingProvider.attributionsHtml : []),
        ],
      }),
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

  onMapTouchStart = (e: maplibregl.MapTouchEvent) => {
    this.handlers.current.onMapTouchStart(e);
  };

  onMapMouseUp = (e: LayerScopedEvent) => {
    this.handlers.current.onMapMouseUp(e);
  };

  onMoveEnd = (e: MoveEvent) => {
    this.handlers.current.onMoveEnd(e);
  };

  onMapTouchEnd = (e: maplibregl.MapTouchEvent) => {
    this.handlers.current.onMapTouchEnd(e);
  };

  onMove = (e: MoveEvent) => {
    this.handlers.current.onMove(e);
  };

  onMapMouseMove = (e: maplibregl.MapMouseEvent) => {
    this.handlers.current.onMapMouseMove(e);
  };

  onMapTouchMove = (e: maplibregl.MapTouchEvent) => {
    this.handlers.current.onMapTouchMove(e);
  };

  onMapDoubleClick = (e: maplibregl.MapMouseEvent) => {
    this.handlers.current.onDoubleClick(e);
  };

  setPresences(presences: IPresence[]) {
    const ids = new Set(presences.map((p) => p.userId));
    for (const presence of presences) {
      const marker =
        this.presenceMarkers.get(presence.userId) ??
        new maplibregl.Marker(cursorSvg(colorFromPresence(presence)));
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
    const featuresSource = this.map.getSource(
      FEATURES_SOURCE_NAME,
    ) as maplibregl.GeoJSONSource;

    const lassoSource = this.map.getSource(
      LASSO_SOURCE_NAME,
    ) as maplibregl.GeoJSONSource;

    const ephemeralSource = this.map.getSource(
      EPHEMERAL_SOURCE_NAME,
    ) as maplibregl.GeoJSONSource;

    const syntheticSource = this.map.getSource(
      SYNTHETIC_SOURCE_NAME,
    ) as maplibregl.GeoJSONSource;

    if (!featuresSource || !ephemeralSource || !syntheticSource) {
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
    const syntheticFeatures = groups.synthetic.length
      ? groups.synthetic.map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            selected: groups.selectionIds.has(feature.id as RawId),
          },
        }))
      : groups.synthetic;
    mSetData(syntheticSource, syntheticFeatures, "synthetic", force);

    if (ephemeralState.type === "lasso") {
      mSetData(
        lassoSource,
        [
          {
            geometry: bboxToPolygon([
              ...ephemeralState.box[0],
              ...ephemeralState.box[1],
            ]),
            properties: {},
            type: "Feature",
          },
        ],
        "features",
        force,
      );
    } else {
      mSetData(lassoSource, [], "features", force);
    }

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
          },
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
          "state",
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
