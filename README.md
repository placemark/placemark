# Placemark

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fplacemark%2Fplacemark&env=VITE_PUBLIC_MAPBOX_TOKEN)

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

2. Obtain a [Mapbox public access token](https://account.mapbox.com/)
   ([docs](https://docs.mapbox.com/help/getting-started/access-tokens/)) and
   [Geocode Earth token](https://app.geocode.earth/keys)
   ([docs](https://geocode.earth/docs/intro/authentication/)).

   Placemark renders maps with the open-source [MapLibre GL JS](https://maplibre.org/).
   The Mapbox token is still used for the default hosted basemaps and the
   directions API; custom XYZ and TileJSON layers do not require it.

3. Configure the package with the tokens from the previous step:

```sh
VITE_PUBLIC_MAPBOX_TOKEN="<your Mapbox public access token>" \
VITE_PUBLIC_GEOCODE_EARTH_TOKEN="<your Geocode Earth token>" \
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

If you're planning to run this often or publicly, take care to secure your
tokens better by adding [URL restrictions to the Mapbox token](https://docs.mapbox.com/help/getting-started/access-tokens/#url-restrictions) and setting allowed Referrer Hostnames to the Geocode Earth one.

For local development, copy `.env.example` to `.env.local` and add your tokens there:
```sh
cp .env.example .env.local
```

## Interesting forks

- [epanetjs](https://epanetjs.com/) - focused on water modeling ([repo](https://github.com/epanet-js/epanet-js))
- [geojson.io/next](https://geojson.io/next/) from Mapbox ([repo](https://github.com/mapbox/geojson.io))
