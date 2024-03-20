# Placemark

This is the open source project Placemark, which was previously a SaaS app.
Placemark is a _tool for creating, editing, and visualizing_ map data,
in a variety of formats including GeoJSON, KML, Shapefiles, CSV, and many
more.

This is a monorepo and it contains multiple subprojects:

## Subprojects

- [Play](https://github.com/placemark/placemark/tree/main/packages/play) is the
  free-to-use interface accessible at [play.placemark.io](https://play.placemark.io/).
  It has no server backend or map storage, but it supports all other features.
- [Placemark-app](https://github.com/placemark/placemark/tree/main/packages/placemark-app)
  is a simplified version of the Placemark SaaS app that supports server storage
  and realtime sync and collaboration.
- The [SaaS branch](https://github.com/placemark/placemark/tree/saas) contains
  the unsimplified, full-fledged code for the Placemark product, which is a superset
  of Placemark-app and includes things like billing and account provisioning.

---

### Placemark could be useful to you if

- You need to edit, preview, create map data and want something similar to [geojson.io](https://geojson.io/),
  a project originally by the same author.
- You want to build a SaaS on this code. It is very liberally licensed. If you want
  to create a startup on this, you can.
- You want to extract patterns or modules from the codebase. It has implementations
  of many things in it.

### Placemark is **not**

- An alternative to Mapbox GL, Maplibre, Deck.gl, etc: it uses Mapbox GL.
  It is a tool for editing maps, it uses existing tech to render the maps.
- A library you can use in your app. But you could possibly extract such a library
  from the codebase with a bit of time and effort.
- A product with customer support. It _used to be_, but is now an open source product
  mostly developed and maintained by [Tom MacWright](https://macwright.com/) in
  his (my) free time.
