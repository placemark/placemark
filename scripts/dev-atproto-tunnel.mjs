import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

// Hostnames come from this machine's cloudflared tunnel (`placemark-dev`,
// see workers/atproto-persistence/README.md) and match the
// `allowedHosts`/`VITE_ATPROTO_PERSISTENCE_URL` wiring in vite.config.mts.
const WORKER_TUNNEL_URL = "https://tunnel-worker.placemark.io";

const specs = [
  {
    name: "wrangler",
    color: 33,
    command: "pnpm",
    args: ["exec", "wrangler", "dev", "--port", "8799"],
    cwd: "workers/atproto-persistence",
  },
  {
    name: "tunnel",
    color: 36,
    command: "cloudflared",
    args: ["tunnel", "run", "placemark-dev"],
  },
  {
    name: "vite",
    color: 35,
    command: "pnpm",
    args: ["dev"],
    env: { VITE_ATPROTO_PERSISTENCE_URL: WORKER_TUNNEL_URL },
  },
];

let shuttingDown = false;
let exitedCount = 0;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    child.kill("SIGTERM");
  }
}

const children = specs.map(({ name, color, command, args, cwd, env }) => {
  const label = `\x1b[${color}m[${name}]\x1b[0m `;
  const child = spawn(command, args, {
    cwd: cwd ? resolve(import.meta.dirname, "..", cwd) : undefined,
    env: env ? { ...process.env, ...env } : process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on("line", (line) => {
      process.stdout.write(`${label}${line}\n`);
    });
  }
  child.on("exit", (code) => {
    process.stdout.write(`${label}exited with code ${code}\n`);
    exitedCount += 1;
    shutdown();
    if (exitedCount === children.length) {
      process.exit(code ?? 0);
    }
  });
  return child;
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
