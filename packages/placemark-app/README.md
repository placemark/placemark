### Placemark

![Placemark screenshot](./.github/screenshot.png)

The Placemark application. This is a web application that lets you
import, create, export, visualize, and publish geospatial data. It supports
many geospatial data formats, and many editing operations, both
algorithmic, like buffering, and drawing-based. You can see
[many YouTube videos](https://www.youtube.com/@_tmcw/videos) of using
the tool, and [the archived website](https://www.placemark.io/)
has marketing for what it previously was.

**Note**: this is an early open source release of the codebase. I'm happy
to help to some extent with setup, but I can't provide end-to-end
integration assistance - it's a fairly complex web application and
it works in the environment it was written in, but it will not work
in every environment: it almost certainly won't work on Windows,
for example.

**I'm happy to accept PRs** that make this easier to set up in different
environments, to make features optional (to reduce the many environment variables
required),
or other broad improvements or fixes! I'm not sure about entirely
_removing_ features, given that I think it's useful to have this
as an example of a fully-integrated real-world application, and things
like error tracking are essential for that.

[Opening an issue](https://github.com/placemark/placemark-oss/issues) is
the best way to get me – I'll get notifications for new issues.

---

See [docs/architecture.md](./packages/placemark-app/docs/architecture.md) for notes on
the technologies under the hood.

### Running with Docker

✨ There's now an example Docker file! See [docs/docker](./packages/placemark-app/docs/docker.md) for details.

### Running in Render

The application is configured by the `render.yaml` file which is
a [Render blueprint](https://render.com/docs/blueprint-spec). Hosting
it on Render and using that is probably the fastest route to getting
it on running, but it will work on similar hosting setups, like
Railway, Heroku, or Flightcontrol. It might also work on Fly.io.

### Installation

This project is built with [pnpm](https://pnpm.io/)
and last tested with version 8.11.0 of pnpm. There's a lockfile
for pnpm. Installing with npm or another package manager will yield
different, and potentially broken, dependencies.

#### Database setup for local development

Placemark requires Postgres to run.

Note that if you're running Placemark with the [docker-compose configuration](./packages/placemark-app/docs/docker.md), Postgres is set up for you as part of the docker configuration. These instructions are relevant if you're running Placemark without Docker.

```
# macOS:

brew install postgresql
brew services start postgresql

# Ubuntu:

sudo apt install postgresql
sudo systemctl start postgresql.service
```

Update these settings in .env:

```
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/placemark
# POSTGRES_HOST=localhost
```

Then:

```
createdb placemark
psql -c "CREATE ROLE postgres WITH LOGIN PASSWORD 'postgres';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE placemark TO postgres;" placemark

# Create the database schema
npx prisma migrate reset
```

### Environment variables

This application reads `.env` files when in development, and requires
environment variables in production. It checks these environment variables
when it starts up, so it _will crash_ if one is missing. This is good:
it's better for applications to crash now rather than later (see [rule of repair](http://www.catb.org/~esr/writings/taoup/html/ch01s06.html)).

You can see a list of the required environment variables at

- [packages/placemark-app/app/lib/env_server.ts](./packages/placemark-app/app/lib/env_server.ts)
- [packages/placemark-app/app/lib/env_client.ts](./packages/placemark-app/app/lib/env_client.ts)

Note that there's a lot of these. Placemark relies on:

### Required

- GitHub
- Replicache

### Optional

- Cloudflare
- Postmark
- WorkOS
- Logtail

### Infrastructure

Placemark relies on two servers:

1. The application (this repository)
2. A Postgres 14 (or higher) database

### Domains

On the web, Placemark is served under three domains:

1. `app.placemark.io`, the main application.
2. `api.placemark.io`, the API

The API is served from the same web server as the app. This is done
by using a [Cloudflare Worker](https://workers.cloudflare.com/)
which proxies requests from `api.placemark.io` to `app.placemark.io`
after setting a rule for the paths that can be requested. There's
an example of this worker in `docs/worker_example.ts`.

### Testing Local SSL

This probably isn't necessary for anyone: for myself, I was having
to test things that only work under SSL, like testing geolocation on
an iPhone, and this was required. You probably don't need to use
local SSL.

Requires Tailscale with `tailscale cert` and the certs moved
to this directory

```
caddy start
```
