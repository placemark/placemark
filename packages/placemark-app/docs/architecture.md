### Architecture

Placemark is mostly a monolith. It uses Blitz, which is a framework on top of Next.js. The database access, APIs, and frontend are all in this repository. We use Blitz's RPC system to manage API access.

There are a few external components:

- Soketi, deployed on Render, which handles WebSockets. This offloads WebSocket management to a separate server and allows the Placemark monorepo to follow the same patterns as Pusher - it interacts with WebSockets in a REST style.
- Postgres, deployed on Render in production and locally when not.

### Installation for development

Otherwise, this is a Node.js application. You should install it like any other Node.js application, with `yarn install`. Yarn is the preferred package manager, and `1.22.4` is the working recommended version of Yarn.

You also need to install the `stripe` CLI, installable with Homebrew. We use the stripe CLI in development to proxy webhooks from Stripe.

Environment variables necessary for work in development are shared person-to-person.

### Service URLs

- Marketing: https://placemark.io/
- Placemark: https://app.placemark.io/
- Analytics (umami): https://a.placemark.io/
- Soketi: https://ws.placemark.io/

### Infrastructure

_Hosts_

- **Render**: Web application, analytics, database, and WebSocket hosting
- **Cloudflare**: DNS host, worker for forwarding requests to the API, caching
- **Webflow**: Hosting & editing for the marketing site & blog

_Services_

- **Sentry**: Crash detection in prod
- **Postmark**: Transactional email
- **CodeClimate**: Code quality scanning

_Business_

- **Stripe**: Business incorporation, payment processing
- **Mercury**: Bank
- **Northwest**: Foreign LLC registration, registered agent
- **Earth Class Mail**: Virtual mailbox
- **SEO**: ahrefs (free plan) https://app.ahrefs.com/site-audit/3629233

### CSS

Styling is ~90% Tailwind, ~5% custom CSS in globals.css, and ~5% inline styles. This works so far, pretty well. Not using CSS Modules, CSS-in-JS, etc. because there's no clear reason to.

I use `classed-components` to "reuse styles" across the application. Open to better options in the future, but it works well so far: basically just lets you easily create a "div with classes" component.

### React Components

Using bits of three component libraries:

- Radix by default
- Only the `interactions` part of react-aria, only to manage one drag event.
- Only the `Combobox` from headless-ui

In the event that Radix introduces a `Combobox`, I'll remove headlessui. It's fine but I'm only using Combobox because it is the most competent implementation I could find. Same with interactions - if there's a Radix alt I'll use it.

### Blitz

Blitz has worked well so far. It's doing a gnarly pivot to a library instead of a framework. I'll switch to the new version when it's available. Thoughts on alts:

- trpc: open to it. Basically blitz's API layer but as far as I've heard, better. But that would require DIY'ing a lot of parts managed by Blitz currently, like testing and DB.
- Remix: competes with Next.js, not Blitz, I'd have to DIY a lot. Most of the SSR stuff does nothing for Placemark.
- Sapper: competes with Next.js, not Blitz. I like it but would have a lot more to do myself.

### Patterns

Not _too_ many weird patterns, I hope.

- Most data structures are plain old objects. But they have associated methods which in another world would be instance methods. Hence the U objects, like USelection, which provide utilities for those objects.
- Wherever possible, low level of abstraction, and so on.
- Basically everything should be virtualized. There can be lots of features and at no point should all of them have DOM nodes.

### purify-ts

This codebase includes a lot of things that can fail. Like, for example, importing a file: it can fail with an error, succeed with notes, or succeed. So, data types should be pretty good. This is currently using purify-ts for Either types, and in one or two places for Maybe types. purify-ts has been fine so far, it's fairly "pragmatic" as FP tools go.

My one issue with purify overall is that it's awkward to use with async. There's an AsyncEither, which is not quite a promise, in that it's lazy rather than eager (it doesn't evaluate until you call .run or another method).

### Possibly confusing stuff

In the post-refactor world, these two Map objects for features and folders are at the center of the data model. They are _ordered_. Map order is specified and implemented in all relevant browsers. `featureMap.values()` should come out in proper order of `at`.

### Map IDs

So Mapbox GL requires the `feature.id` property to be an integer. No floats, no strings. This is probably good anyway because what's passed into GL should be minimal. However, we have UUIDs at the application level. Hence UIDMap and an ID system. Feature IDs are integers, vertex IDs are two numbers encoded as integers, midpoint IDs are like that. It's all "packed numbers" stuff and a little convoluted and could be improved in the future.

### Naming

I'm a real pedant for naming stuff. And this codebase doesn't follow rules perfectly, but it definitely tries.

- Trying to avoid abbreviations. For example, GeoJSON features should be called "feature", wrapped features should be called "wrappedFeature".
