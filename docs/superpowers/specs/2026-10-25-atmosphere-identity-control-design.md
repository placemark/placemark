# Atmosphere identity control — design

Date: 2026-10-25

## 1. Overview & scope

Replace the current scattered Atmosphere (atproto cloud provider) entry points — a
"Sign in with Atmosphere" item buried in the File menu, a separate sign-out control
inside the same menu, and a bare "Save" button in the toolbar's `CloudMapInfo` — with
one persistent identity control in the top bar, to the right of the Help menu.

Signed out, it's a single affordance that reads as "connect your Atmosphere account."
Signed in, it's your avatar: hover shows your handle, click opens a popover with every
cloud-map action in one place (save, save new version, copy share link, open map, sign
out). The toolbar keeps a passive read-only display of the currently open cloud map's
name (unchanged from today, minus its Save button).

This is a UI relocation, not a behavior change to the underlying sign-in/save/share
mutations built in earlier work (`app/lib/cloud_providers/atproto/client.ts`,
`app/lib/cloud_providers/atproto/share.ts`, `cloud_save_map.tsx`, `cloud_maps.tsx`).

## 2. Component & placement

New component `AtmosphereIdentity` in `app/components/atmosphere_identity.tsx`,
exported and rendered in `app/components/menu_bar.tsx` immediately after `HelpDot`.
Like `CloudMapInfo`/`CloudMenuItems`, it reads `CLOUD_PROVIDERS[0]` and renders nothing
if no provider is configured (this is the existing pattern for the feature being fully
absent when `VITE_ATPROTO_PERSISTENCE_URL` is unset).

Three states, driven by `provider.useAuthState()`:

- **Loading** (`authState` not yet resolved) — render nothing, to avoid a flash of the
  signed-out control before the `Me()` query settles.
- **Signed out** — a single `Button variant="quiet"` containing two small icons side by
  side: a share glyph (`Share1Icon` from `@radix-ui/react-icons`) and a Bluesky
  butterfly glyph (new inline SVG component, see §4). Tooltip: "Sign in with
  Atmosphere." Clicking either icon opens the existing `cloud_sign_in` dialog via
  `dialogAtom` — no change to that dialog's contents, only a new trigger.
- **Signed in** — a circular avatar button (see §4 for the image). `Tooltip` on hover
  shows `@{handle}`. Clicking opens a `Popover.Content` with:
  1. `@{handle}` as a non-interactive header line
  2. **Sign out** — same `signOutMutation` logic currently in `CloudMenuItems`
  3. separator
  4. **Save current map** (opens `cloud_save_map` dialog) — shown when `cloudMapAtom`
     is `null`
  5. **Save new version** (direct mutation, ported from `cloud_map_info.tsx`'s
     `updateMutation`) — shown when `cloudMapAtom` is set
  6. **Copy share link** — `navigator.clipboard.writeText(sharedMapUrl(cloudMap.ownerDid, cloudMap.rkey))`,
     toast on success — shown when `cloudMapAtom` is set
  7. **Open map…** (opens `cloud_maps` dialog) — always shown when signed in

Items 4–7 are the union of what `CloudFileMenuItems` and `CloudMapInfo`'s Save button
do today; nothing new is being added except "Copy share link," which reuses the
existing `shareMutation`'s URL-building (`cloud_maps.tsx`) but is newly surfaced outside
that dialog.

## 3. Avatar fetching

New hook `useAtmosphereAvatar(did: string | undefined)` in `atmosphere_identity.tsx`,
backed by `useQuery`:

```ts
useQuery({
  queryKey: ["atmosphere-avatar", did],
  queryFn: async () => {
    const res = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did!)}`,
    );
    if (!res.ok) throw new Error("profile fetch failed");
    const data: unknown = await res.json();
    // narrow to { avatar?: string } defensively, same style as share.ts's
    // fetchSharedMap response validation
    ...
    return typeof data.avatar === "string" ? data.avatar : null;
  },
  enabled: !!did,
  staleTime: 60 * 60 * 1000, // avatars don't change minute to minute
  retry: false,
})
```

This is a public, unauthenticated, cross-origin GET — no credentials, no CORS issues
(Bluesky's public AppView already serves this to browsers). On failure, missing DID, or
no avatar set, the component falls back to a plain circle containing `PersonIcon` —
never blocks render or surfaces an error toast for this; it's cosmetic only.

## 4. New Bluesky icon

No radix-icons butterfly glyph exists. Add a small inline `BlueskyIcon` function
component in `atmosphere_identity.tsx` (or a shared `icons.tsx` if we expect more
brand glyphs later — not expected, so keep it local) using the standard simplified
Bluesky butterfly path (the same glyph used by simple-icons and Bluesky's own
press kit), sized to match surrounding `@radix-ui/react-icons` icons (`16x16`
viewBox convention, `currentColor` fill).

## 5. Cleanup elsewhere

- `app/components/menu_bar/menu_bar_dropdown.tsx`: delete `CloudMenuItems`,
  `CloudMenu`, `CloudFileMenuItems`, `CloudFileMenu`, and their call sites
  (`<CloudFileMenu />` after "Export SVG", `<CloudMenu />` at the end of the
  dropdown). The File menu returns to just Import / Export / Export SVG / Undo
  history. Drop now-unused imports (`useMutation`, `useQueryClient`, `ExitIcon`,
  `toast`, `captureException`, `CLOUD_PROVIDERS`, `CloudProvider` type) if nothing
  else in the file needs them.
- `app/components/cloud_map_info.tsx`: remove the `Button`/`updateMutation` and
  their imports; keep only the `ArchiveIcon` + truncated map-name `div`. This
  mutation's logic moves into `AtmosphereIdentity`'s "Save new version" item.

## 6. Error handling

Unchanged from existing behavior for all mutations (toast + `captureException` on
failure, same as today in `cloud_save_map.tsx`/`cloud_map_info.tsx`/`cloud_maps.tsx`).
The only new failure surface is the avatar fetch, which is intentionally silent (§3).

## 7. Testing

No existing test coverage for these UI components (they're untested presentational
React, consistent with sibling dialogs). Manual verification: sign in, confirm avatar
renders (or falls back cleanly for a DID with no Bluesky avatar), confirm all four
popover actions work, confirm File menu no longer shows cloud items, confirm signed-out
control opens sign-in.
