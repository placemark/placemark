# Map licenses and services

- Rendering uses `maplibre-gl` under BSD-3-Clause.
- Style parsing uses `@maplibre/maplibre-gl-style-spec`. Its package metadata
  identifies ISC, and its distributed BSD notices are preserved with the
  renderer notices in [`public/maplibre-license.txt`](../public/maplibre-license.txt).
- OpenFreeMap is the default tile and style provider. Its TileJSON attribution
  remains visible through MapLibre's attribution control.
- OpenFreeMap styles are MIT with upstream BSD and Creative Commons design
  licenses. See the
  [OpenFreeMap license](https://github.com/hyperknot/openfreemap-styles/blob/main/LICENSE.md).
- The [RTL text plugin](https://github.com/mapbox/mapbox-gl-rtl-text/blob/main/LICENSE.md)
  is BSD-3-Clause and is loaded as recommended by MapLibre.
- Custom styles, tiles, and routing endpoints must permit the intended use.
- No routing provider is enabled by default. Configured routing results are
  stored in Placemark documents and may be exported.
