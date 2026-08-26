# Map licenses and services

- Rendering uses `maplibre-gl` under BSD-3-Clause.
- Style parsing uses `@maplibre/maplibre-gl-style-spec` under ISC.
- OpenFreeMap is the default tile and style provider. Its TileJSON attribution
  remains visible through MapLibre's attribution control.
- OpenFreeMap styles are MIT with upstream BSD and Creative Commons design
  licenses. See the
  [OpenFreeMap license](https://github.com/hyperknot/openfreemap-styles/blob/main/LICENSE.md).
- The [RTL text plugin](https://github.com/mapbox/mapbox-gl-rtl-text/blob/main/LICENSE.md)
  is BSD-3-Clause and is loaded as recommended by MapLibre.
- Custom styles, tiles, and routing endpoints must permit the intended use.
- No routing provider is enabled by default. See the
  [routing provider configuration](routing.md) for export terms and required
  attribution.
