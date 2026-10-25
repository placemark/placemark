# Sharing

Placemark supports sharing again!

When it was an indie startup that charged money, Placemark had map persistence. I
built it on Postgres, my default database. Maps had IDs and were shareable and editable
in real-time with a team. It was cool! But when I [open sourced](https://macwright.com/2024/01/19/placemark-oss)
Placemark, I ripped out the backend parts and have run it as a pure frontend
since. Frontends are roughly free, and backends cost money. My side projects
aim to cost zero or low amounts so that I can keep them going indefinitely, and
though it brings me satisfaction to keep Placemark running, it's not a charity.

But persistence and sharing are very useful properties, and it has limited the usefulness
of Placemark. I kept grasping for a better way to do persistence, anyway. In
particular, I really wanted a way to share maps that _didn't_ make me the
middleman. I didn't want to be relied on to keep some server online and store
backups. I didn't want the pressure of keeping it secure. I wanted users to be
able to leave at any moment, to bring their data elsewhere.

After trying and dismissing a few other options, like auth against Dropbox, I decided
on the [AT Protocol](https://atproto.com/) for the initial implementation. It's best-known
for being the protocol being Bluesky. I really like it, and I even [went to a conference](https://macwright.com/2026/04/05/in-the-atmosphere)
about it. Mostly I've been on the sidelines, but this is my chance to dive in.

The protocol gives me some really cool and important properties for this usecase:

1. When users store maps, they're stored in _their own_ storage. Usually this does mean
  on a Bluesky server, but it can also be a self-hosted server or some other big
  Atmosphere host. It's straightforward for users to move to a different host if they want to.
2. It is very possible for someone else to build an alternative to Placemark that iteroperates
  and pulls from the maps people stored with Placemark.
3. It supports medium-sized blobs, so storing GeoJSON-as-[Flatgeobuf](https://flatgeobuf.org/)
  is pretty doable: there are limits, but once you're near them, the dataset will be somewhat
  big for a browser anyway.

It does have some big drawbacks - no stable solution for storing private data, yet.
They're [working on one](https://atproto.com/blog/atproto-spaces-alpha) and I'll adopt
it when they're done, but for now this is a solution for storing public maps only.

## The implementation

Stating up front: this is a pretty LLM-driven implementation. It's huge and
complex and I really wanted to dig into the protocol specifics, and I _have_
read all of the code, but the reality is that there was enough complexity
involved in this that even with the computer assistance, it took a significant
amount of my limited free time.

I have mixed feelings about this, as you'd expect. Sometimes I think LLMs are
[the cause of, and solution to, all of life's problems](https://www.youtube.com/watch?v=hUVwR0rw5fk).
Before this big PR (and the Maplibre port), Placemark was [low-background steel](https://en.wikipedia.org/wiki/Low-background_steel),
written delicately by hand, most by one human. But Placemark aims to be _useful_
and this change absolutely makes it more so.

To authenticate against the Atmosphere, I'm running a small Cloudflare Worker.
It brokers the authentication flow and handles loading maps. As with most of
my new projects, the code uses [Effect](https://effect.website/) heavily.
It also uses the excellent [atcute](https://github.com/mary-ext/atcute) modules
for smoothing out some of the protocol specifics.

The design anticipates more than one Atmosphere-like provider: I might return to
Dropbox again, or scope out an S3 connector too. I want people to have control
over where their data lives.

It's a little rough around the edges: especially for some of the UX, I'm going
to work on refining it in the future.

Also, this is designed to hopefully be minimally disruptive for people who
want to use Placemark as a starting place for a hard fork. There are a few people
and companies building on Placemark, including [geojson.io and epanet-js](https://macwright.com/2026/08/19/new-geojson-io),
and I think that's great. The project still works with the Atmosphere login
unconfigured and it'll just hide that part of the UI.
