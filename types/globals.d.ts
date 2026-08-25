/// <reference types="react/next" />

type Opaque<Type, Token = unknown> = Type & { readonly __opaque__: Token };

type BBox4 = [number, number, number, number];

type Pos2 = [number, number];
type VertexId = {
  type: "vertex";
  featureId: number;
  vertex: number;
};

type FeatureId = {
  type: "feature";
  featureId: number;
};

type MidpointId = {
  type: "midpoint";
  featureId: number;
  vertex: number;
};

type Id = FeatureId | VertexId | MidpointId;

// Renderer-land ID system
type RawId = Opaque<number, "RawId">;

// React-land ID system
type StringId = string;

type LayerScopedEvent = import("maplibre-gl").MapMouseEvent & {
  features?: import("maplibre-gl").MapGeoJSONFeature[];
};

type BothHandler = (
  arg0:
    | import("maplibre-gl").MapMouseEvent
    | import("maplibre-gl").MapTouchEvent,
) => Promisable<void>;

type TouchHandler = (
  arg0: import("maplibre-gl").MapTouchEvent,
) => Promisable<void>;

type Handlers = {
  click: BothHandler;
  move: BothHandler;
  down: BothHandler;
  touchstart?: TouchHandler;
  touchmove?: TouchHandler;
  touchend?: TouchHandler;
  up: BothHandler;
  double: BothHandler;
  enter: () => Promisable<void>;
};
