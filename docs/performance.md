## Bottlenecks

- Updating Mapbox GL JS with new data. Specifically: sending new values across the postMessage boundary, and generating new tiles in geojson-vt.
- Replicache. Specifically: its assertJSON step (fixed), scan performance (fixed), store performance when a map is loaded.
- Generating folder structures and sorting features.

## Ideas

### Compact features

- Binary encoding probably doesn't make sense - doesn't work well with Replicache, would require encoding & decoding.
- Could create a faster GeoJSON Feature representation, like `[properties, geometry, otherattributes]`. Possibly dropping `type` properties would yield a bump.
- IDs are less efficient than they could be. We're storing a UUID, hex-encoded with dashes, twice per feature in the key and the feature. Switching to base64url would save 14 bytes per feature, dropping one of the UUIDs (using the key as the ID) would save 32 bytes per feature. Doing both, saving 46 bytes/feature leads to 1kb savings every 21 features.
