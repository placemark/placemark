// Derives the branch alias used for atproto-persistence Cloudflare preview
// URLs. Shared by:
//
//   - .github/workflows/atproto-preview.yml, which uploads each branch via
//     `wrangler versions upload --preview-alias <slug>` (run with `node`)
//   - vite.config.mts, which points Cloudflare Pages branch builds of the app
//     at the matching `https://<slug>-atproto-persistence.<subdomain>.workers.dev`
//
// Both sides import this one implementation so the app build's URL always
// matches the URL the workflow published.
//
// Cloudflare alias rules: lowercase letters, digits, and dashes; must start
// with a lowercase letter; alias and worker name joined by a dash must fit a
// 63-character DNS label, so the alias is capped at 63 - 19 - 1 = 43
// characters.

import { pathToFileURL } from "node:url";

const WORKER_NAME = "atproto-persistence";
const MAX_ALIAS_LENGTH = 63 - WORKER_NAME.length - 1;

export function branchSlug(branch) {
  let slug = branch
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_ALIAS_LENGTH)
    .replace(/-+$/, "");
  if (slug.length === 0) {
    slug = "branch";
  } else if (!/^[a-z]/.test(slug)) {
    slug = `b-${slug}`.slice(0, MAX_ALIAS_LENGTH);
  }
  return slug;
}

// CLI: `node scripts/atproto-branch-slug.mjs <branch-name>`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const branch = process.argv[2];
  if (!branch) {
    console.error("usage: node scripts/atproto-branch-slug.mjs <branch-name>");
    process.exit(1);
  }
  console.log(branchSlug(branch));
}
