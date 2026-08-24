# Placemark

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fplacemark%2Fplacemark)

Placemark is an open source and free application for creating, viewing,
editing, and analyzing map data. Most people who want to use this application
should visit [Placemark.io](https://www.placemark.io/), the main instance.
The rest of this README is for people who want to tinker with it as a developer,
fork it, etc.

## Getting started

There are more sophisticated approaches using Docker or Render (see files), but
the following simple approach works locally on macOS:

1. Clone the repository, change to this directory, and install dependencies.

This repository expects you to use [pnpm](https://pnpm.io/) and Node 24.5.0,
which can be installed using [mise](https://mise.jdx.dev/) or manually.

```
git clone
pnpm install
```

2. Optionally obtain a [Geocode Earth token](https://app.geocode.earth/keys)
   ([docs](https://geocode.earth/docs/intro/authentication/)) for search.

   Placemark renders maps with the open-source [MapLibre GL JS](https://maplibre.org/).
   Its default basemaps are hosted by [OpenFreeMap](https://openfreemap.org/)
   and require no token. Mapbox-hosted basemap styles are not loaded. See
   [map licenses and services](docs/map-licenses.md) for details.

   Routing requires an OSRM-compatible service whose terms permit storing and
   exporting route results. No routing service is configured by default.

3. If needed, configure the optional services:

```sh
VITE_PUBLIC_GEOCODE_EARTH_TOKEN="<your Geocode Earth token>" \
VITE_PUBLIC_OSRM_URL="http://localhost:5000/route/v1"
```

4. Start the server:

Either in development mode with hot-reloading:

```sh
pnpm dev
```

Or build a `dist/` directory that you can serve as normal files:

```sh
pnpm build
pnpm dlx serve@latest dist
```

If you're planning to run this often or publicly, set allowed Referrer
Hostnames on the Geocode Earth token.

For local development, copy `.env.example` to `.env.local` and add your tokens there:
```sh
cp .env.example .env.local
```

## Interesting forks

- [epanetjs](https://epanetjs.com/) - focused on water modeling ([repo](https://github.com/epanet-js/epanet-js))
- [geojson.io/next](https://geojson.io/next/) from Mapbox ([repo](https://github.com/mapbox/geojson.io))
