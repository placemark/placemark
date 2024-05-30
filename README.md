# Play

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fplacemark%2Fplacemark&env=NEXT_PUBLIC_MAPBOX_TOKEN)

At some point during Placemark development, I tried making a free-as-in-beer
interface that supported a lot of the things that Placemark could, but for free.
The main difference between this and the main application being that Placemark Play
wouldn't have a real server component, so it incurred no real storage or server
costs for me.

People like free stuff and a lot of people don't want or need Placemark's server
storage for maps, so Play got a bit of a following. This subproject is trying to
run Play again.

It's not easy, I'll tell you that! Placemark was, for many reasons, a monolithic
application, and Play was part of that monolith. So there are challenges to slicing
off just a bit of the application.

This directory is basically the application, _minus_ Blitz and the database layer
and all of that. It's a real experiment - expect breakage, and hopefully contribute
pull requests. I'm happy to try and make Placemark useful to folks, and don't
feel bad or bitter about the fate of the company, but realistically if the
open source project is to succeed, it'll need contributors as well as users.

## Getting started

There are more sophisticated approaches using Docker or Render (see files), but
the following simple approach works locally on macOS:

1. Clone the repository, change to this directory, and install dependencies:

```
git clone
pnpm install
```

2. Obtain a [Mapbox public access token](https://account.mapbox.com/)
   ([docs](https://docs.mapbox.com/help/getting-started/access-tokens/)) and
   [Geocode Earth token](https://app.geocode.earth/keys)
   ([docs](https://geocode.earth/docs/intro/authentication/)).

3. Build the package with the tokens from the previous step:

```sh
NEXT_PUBLIC_MAPBOX_TOKEN="<your Mapbox public access token>" \
NEXT_PUBLIC_GEOCODE_EARTH_TOKEN="<your Geocode Earth token>" \
pnpm build

```

4. Start the server:

```sh
npx serve@latest out
```

5. Visit [http://localhost:3000](http://localhost:3000)

If you're planning to run this often or publicly, take care to secure your
tokens better by adding [URL restrictions to the Mapbox token](https://docs.mapbox.com/help/getting-started/access-tokens/#url-restrictions) and setting allowed Referrer Hostnames to the Geocode Earth one,
and consider copying and revising the `.env.sample` file.
