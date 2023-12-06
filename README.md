### Placemark

The Placemark application.

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

---

See [docs/architecture.md](./docs/architecture.md) for notes on
the technologies under the hood.

### Setup hints

There _isn't, yet_ a Docker configuration for this application: I
personally don't use Docker when it isn't absolutely necessary.
The application is configured by the `render.yaml` file which is
a [Render blueprint](https://render.com/docs/blueprint-spec). Hosting
it on Render and using that is probably the fastest route to getting
it on running, but it will work on similar hosting setups, like
Railway, Heroku, or Flightcontrol. It might also work on Fly.io.

### Environment variables

This application reads `.env` files when in development, and requires
environment variables in production. It checks these environment variables
when it starts up, so it _will crash_ if one is missing. This is good:
it's better for applications to crash now rather than later (see [rule of repair](http://www.catb.org/~esr/writings/taoup/html/ch01s06.html)).

You can see a list of the required environment variables at

- [app/lib/env_server.ts](./app/lib/env_server.ts)
- [app/lib/env_client.ts](./app/lib/env_client.ts)

Note that there's a lot of these. Placemark relies on:

- Stripe
- Posthog
- Logtail
- Postmark
- WorkOS
- GitHub
- Cloudflare
- CampaignMonitor
- Replicache

Some of these could be made optional because self-hosted installations
probably don't need Stripe. Doing this is very possible, and I'd gladly
accept PRs doing so - but it's probably not something that I'll (tmcw)
be able to do with my limited time.

### Infrastructure

Placemark relies on three servers:

1. The application (this repository)
2. A Postgres 14 (or higher) database
3. An installation of [Soketi](https://github.com/soketi/soketi)

The Soketi server is to handle Websockets, which is something that I
preferred to keep out of the main app because it's a very different
workload. It's just Soketi with no modifications.

### Domains

On the web, Placemark is served under three domains:

1. `app.placemark.io`, the main application.
2. `ws.placemark.io`, the Soketi installation.
3. `api.placemark.io`, the API

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
