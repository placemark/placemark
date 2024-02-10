import { DownloadIcon } from "@radix-ui/react-icons";
import { DialogHeader } from "app/components/dialog";
import { expression } from "@mapbox/mapbox-gl-style-spec";
import {
  TextWell,
  Button,
  inputClass,
  StyledLabelSpan,
  StyledField,
  styledCheckbox,
} from "app/components/elements";
import { renderToStaticMarkup } from "react-dom/server";
import { rewindGeometry } from "@placemarkio/geojson-rewind";
import * as geo from "d3-geo";
import { SVGAttributes, useContext, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { dataAtom } from "state/jotai";
import { FeatureCollection, IFeature, ISymbolization, LineString } from "types";
import { Field, Form, Formik } from "formik";
import { useRootItems } from "app/components/panels/feature_editor/feature_editor_folder/math";
import { Root } from "@tmcw/togeojson";
import { usePersistence } from "app/lib/persistence/context";
import { asColorExpression } from "app/lib/load_and_augment_style";
import memoizeOne from "memoize-one";
import { purple900 } from "app/lib/constants";
import { MapContext } from "app/context/map_context";

const getExpr = memoizeOne((symbolization: ISymbolization) => {
  const expressionDefinition = asColorExpression({
    symbolization,
  });

  if (typeof expressionDefinition === "string") {
    return () => expressionDefinition;
  }

  const expr = expression.createExpression(expressionDefinition);

  return (feature: IFeature) => {
    return expr.value.evaluate({}, feature);
  };
});

function getColor(symbolization: ISymbolization, feature: IFeature) {
  try {
    return getExpr(symbolization)(feature);
  } catch (e) {
    return purple900;
  }
}

interface Config {
  chartWidth: number;
  chartHeight: number;
  padding: number;
  pointRadius: number;
  projection: Projection["id"];
  extent: (typeof EXTENTS)[number];
  sphere: boolean;
}

interface Projection {
  id: keyof typeof geo;
  fn: () => geo.GeoProjection;
  label: string;
}

const EXTENTS = ["Features", "World", "Viewport"] as const;

const PROJECTIONS: Projection[] = [
  {
    id: "geoMercator",
    fn: geo.geoMercator,
    label: "Web Mercator",
  },
  {
    id: "geoEquirectangular",
    fn: geo.geoEquirectangular,
    label: "Equirectangular",
  },
  {
    id: "geoAzimuthalEqualArea",
    fn: geo.geoAzimuthalEqualArea,
    label: "Azimuthal Equal Area",
  },
  {
    id: "geoConicEquidistant",
    fn: geo.geoConicEquidistant,
    label: "Conic Equidistant",
  },
  {
    id: "geoAlbers",
    fn: geo.geoAlbers,
    label: "Albers",
  },
  {
    id: "geoEqualEarth",
    fn: geo.geoEqualEarth,
    label: "Equal Earth",
  },
];

function SvgChild({
  child,
  path,
  symbolization,
}: {
  child: Root["children"][number];
  path: geo.GeoPath;
  symbolization: ISymbolization;
}) {
  switch (child.type) {
    case "folder": {
      const name = child.meta.name;
      const attrs = typeof name === "string" ? { id: name } : {};
      return (
        <g {...attrs}>
          {child.children.map((child, i) => {
            return (
              <SvgChild
                child={child}
                path={path}
                key={i}
                symbolization={symbolization}
              />
            );
          })}
        </g>
      );
    }
    case "Feature": {
      const geometry = child.geometry;
      if (!geometry) return null;
      const d = path(rewindGeometry(geometry, true));
      if (!d) return null;

      const attrs: SVGAttributes<SVGPathElement> = { d };

      const color = getColor(symbolization, child as IFeature) || "black";

      if (geometry.type === "LineString" || "MultiLineString") {
        attrs.stroke = color;
      }

      if (geometry.type === "Polygon" || "MultiPolygon" || "Point") {
        attrs.fill = color;
        attrs.fillOpacity = 0.2;
      }

      return <path {...attrs} />;
    }
  }
}

function SvgMap({
  config,
  root,
  path,
  symbolization,
  exporting = false,
}: {
  config: Config;
  root: Root;
  path: geo.GeoPath;
  symbolization: ISymbolization;
  exporting?: boolean;
}) {
  const htmlProps = {
    className: "border border-gray-200 bg-white w-full",
    style: {
      aspectRatio: `${config.chartWidth} / ${config.chartHeight}`,
    },
  } as const;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox={`0 0 ${config.chartWidth} ${config.chartHeight}`}
      {...(exporting ? {} : htmlProps)}
    >
      {config.sphere ? (
        <path d={path({ type: "Sphere" })!} fill="none" stroke="black" />
      ) : null}
      {root.children.map((child, i) => {
        return (
          <SvgChild
            child={child}
            key={i}
            path={path}
            symbolization={symbolization}
          />
        );
      })}
    </svg>
  );
}

export function ExportSVGDialog() {
  const data = useAtomValue(dataAtom);
  const map = useContext(MapContext);
  const rep = usePersistence();
  const [meta] = rep.useMetadata();
  const { featureMap } = data;
  const root = useRootItems(data);
  const [config, setConfig] = useState<Config>({
    padding: 10,
    pointRadius: 4.5,
    chartWidth: 800,
    chartHeight: 800,
    projection: PROJECTIONS[0].id,
    sphere: false,
    extent: EXTENTS[0],
  });

  const mapExtent = useMemo(() => {
    const bounds = map?.map.getBounds();
    if (!bounds) {
      const sphere: geo.GeoSphere = { type: "Sphere" };
      return sphere;
    }
    const b = bounds.toArray();
    const ls: LineString = {
      type: "LineString",
      coordinates: [b[0], b[1]],
    };
    return ls;
  }, [map]);

  const path = useMemo(() => {
    const fc: FeatureCollection = { type: "FeatureCollection", features: [] };
    for (const { feature } of featureMap.values()) {
      const geometry = feature.geometry;
      if (!geometry) continue;
      const rewound = rewindGeometry(geometry, true);
      fc.features.push({
        type: "Feature",
        geometry: rewound,
        properties: feature.properties,
      });
    }

    const projection = PROJECTIONS.find(
      (proj) => proj.id === config.projection
    );

    if (!projection) {
      throw new Error("Projection unexpectedly not found");
    }

    const proj = projection.fn().fitExtent(
      [
        [config.padding, config.padding],
        [
          config.chartWidth - config.padding,
          config.chartHeight - config.padding,
        ],
      ],
      config.extent === "Features"
        ? fc
        : config.extent === "World"
        ? {
            type: "Sphere",
          }
        : mapExtent
    );

    const path = geo.geoPath(proj).pointRadius(config.pointRadius);

    return path;
  }, [featureMap, featureMap.version, config, mapExtent]);

  async function onExport() {
    const { fileSave } = await import("browser-fs-access");
    const rendered = renderToStaticMarkup(
      <SvgMap
        root={root}
        path={path}
        config={config}
        symbolization={meta.symbolization}
      />
    );
    const svgStr = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
  ${rendered}`;
    await fileSave(new Blob([svgStr]), {
      description: "Save file",
      extensions: [".svg"],
    });
    return;
  }

  return (
    <>
      <DialogHeader title="Export SVG" titleIcon={DownloadIcon} />
      <TextWell>
        SVG Export is a specialized option: what you get here won’t be a
        finished product, but a basic element that you can use when you import
        it into a drawing tool.
        <br />
        <br />
        This tool is in Beta: please submit feedback to help us improve it!
      </TextWell>
      <div className="h-2" />

      <div className="flex items-center justify-center border border-gray-200 p-2 bg-gray-200">
        <SvgMap
          root={root}
          path={path}
          config={config}
          symbolization={meta.symbolization}
        />
      </div>

      <Formik
        initialValues={config}
        onSubmit={(values) => {
          setConfig(values);
        }}
      >
        <Form>
          <div className="pt-4 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2 p-2 border border-gray-200 rounded">
              <label className="flex items-center gap-x-2">
                <StyledField
                  type="number"
                  className={inputClass({ _size: "sm" }) + " w-32"}
                  name="chartWidth"
                />
                <StyledLabelSpan>Width</StyledLabelSpan>
              </label>
              <label className="flex items-center gap-x-2">
                <StyledField
                  type="number"
                  className={inputClass({ _size: "sm" }) + " w-32"}
                  name="chartHeight"
                />
                <StyledLabelSpan>Height</StyledLabelSpan>
              </label>
              <label className="flex items-center gap-x-2">
                <StyledField
                  type="number"
                  className={inputClass({ _size: "sm" }) + " w-32"}
                  name="padding"
                />
                <StyledLabelSpan>Padding</StyledLabelSpan>
              </label>
              <label className="flex items-center gap-x-2">
                <StyledField
                  type="number"
                  className={inputClass({ _size: "sm" }) + " w-32"}
                  name="pointRadius"
                />
                <StyledLabelSpan>Point radius</StyledLabelSpan>
              </label>
              <label className="flex items-center gap-x-2">
                <Field
                  type="checkbox"
                  className={styledCheckbox({ variant: "default" })}
                  name="sphere"
                />
                <StyledLabelSpan>Sphere outline</StyledLabelSpan>
              </label>
              <label className="flex items-center gap-x-2">
                <Field
                  as="select"
                  className={inputClass({ _size: "sm" }) + " w-32"}
                  name="extent"
                >
                  {EXTENTS.map((extent) => {
                    return (
                      <option key={extent} value={extent}>
                        {extent}
                      </option>
                    );
                  })}
                </Field>
                <StyledLabelSpan>Extent</StyledLabelSpan>
              </label>
              <label className="flex items-center gap-x-2">
                <Field
                  as="select"
                  className={inputClass({ _size: "sm" }) + " w-32"}
                  name="projection"
                >
                  {PROJECTIONS.map((proj) => {
                    return (
                      <option key={proj.id} value={proj.id}>
                        {proj.label}
                      </option>
                    );
                  })}
                </Field>
                <StyledLabelSpan>Projection</StyledLabelSpan>
              </label>
            </div>
            <Button type="submit">Update settings</Button>
          </div>
        </Form>
      </Formik>

      <div className="pt-6 pb-1 flex flex-col sm:flex-row-reverse space-y-2 sm:space-y-0 sm:gap-x-3">
        <Button type="button" onClick={onExport} variant="primary">
          Export
        </Button>
      </div>
    </>
  );
}
