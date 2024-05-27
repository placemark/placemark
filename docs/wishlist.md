## Wishlist

- Use Cloudflare/Protomaps for shared maps https://protomaps.com/docs/cdn/cloudflare
- Image rectification https://twitter.com/chris_whong/status/1554450376174325760
- Annotating non-map images https://github.com/alanaberdeen/AIDA https://www.fastmail.com/mail/Inbox/Tbaa8d8e603f9faad.Mb6c3e6f1ce5658fee02c2a7d?u=5eb940b1
- Switch from fuse to nextra for search? https://github.com/nextapps-de/flexsearch
- Stac support https://github.com/stac-utils/stac-layer _per conversation with Chris Holmes, this is not a good priority_
- Try alternative polygon clipping https://github.com/substack/pclip
- Try react-aria table component or react-table https://react-table.tanstack.com/docs/examples/virtualized-rows
- Load/save Dropbox https://www.dropbox.com/developers/chooser
- Binning/heatmap
- URL API: Just like geojson.io - an API that lets you load data and share stuff via URL.
- 2FA https://github.com/placemark/placemark/issues/334
- CLI https://github.com/placemark/placemark/issues/63
- Drag vertex to the side and scroll
- In vertex multi-selection mode, dragging should drag multiple vertices
- cache dependencies in render https://feedback.render.com/features/p/specify-additional-directories-to-cache-after-build
- Electron app
- Swap panel to left side of the screen
- Controls to tint satellite layer https://github.com/placemark/placemark/issues/591
- Google Docs Connector. Ability to connect a google docs sheet (with point data) and edit it from placemark
- GitHub connector. Basically what geojson.io had - the ability to edit files in a GitHub repo. Probably with LFS support.
- get placemark.com and @placemark on twitter
- Extension library
- Preview mapbox gl styles with data
- Property column formulas in the table editor. Could be javascript functions. Could even permit async! With turf functions!
- Connect to databases
- Ability to sort feature list
- Extract data from openstreetmap
- Draw circles
- Add random points?
- Voronoi triangulation
- Altitude support (the third coordinate)
- Make UI scriptable "very deep desire of mine is to see a bridging of the GUI-CLI divide" https://twitter.com/korede_ta/status/1255228104999612416
- Add country codes to points https://github.com/placemark/placemark/issues/291
- Support for coordinateProperties from https://github.com/placemark/placemark/issues/515

### Done

- ~~Custom tiled overlay~~
- ~~Add POI for nominatim or another source~~ https://github.com/placemark/placemark/pull/1940
- ~~Rewind coordinates on draw end?~~ https://github.com/placemark/placemark/pull/2093
- ~~Join data on country code or state to existing geodata~~ https://github.com/placemark/placemark/issues/1513
- ~~Changelog system~~ https://www.placemark.io/post/changelog-april-25
- ~~Use uuid v7 or an ordered UUID alternative for better database locality~~ #1230
- ~~Simplify operation~~
- ~~Go here in OpenStreetMap~~
- ~~Buffer operation~~
- ~~Responsive / mobile mode~~
- ~~[[Collaboration]]~~
- ~~Filtering features~~
- ~~Use purify's Either implementation https://gigobyte.github.io/purify/adts/Either~~
- **Undo/redo** Brandon mentioned that some operations are destructive and there's no undo.
- ~~Use jsonpointer for addressing/ids https://github.com/janl/node-jsonpointer~~

### Punt

- ~~Support the editor-layer-index for additional layer sources https://github.com/placemark/placemark/issues/473~~
- ~~Switch quickswitcher to kbar? https://github.com/timc1/kbar~~

### Formats

- ~~KMZ~~
- Geopackage
- ~~Shapefile~~
- S2 IDs
- ~~Flatgeobuf~~
- SVG

---

## On-prem

https://www.nuon.co/

## Idea scratchpad

Load features from IndexedDB in a webworker to generate tiles
