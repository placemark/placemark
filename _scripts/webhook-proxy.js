/* eslint-disable @typescript-eslint/no-var-requires */
const { spawn } = require("child_process");
const fs = require("fs");

const proxy = spawn("stripe", [
  "listen",
  "--forward-to",
  "http://localhost:3000/api/webhook",
]);

proxy.stderr.pipe(process.stderr);
proxy.stdout.pipe(process.stdout);

let done = false;
new Promise((resolve) => {
  function onData(data) {
    if (done) return;
    const output = data.toString();
    const secret = output.match(/(whsec_[a-zA-Z0-9]+)/);
    if (secret) {
      // console.log(`Got development only webhook secret ${secret[1]}`);
      const local = fs.readFileSync("./.env.local", "utf8");
      const map = Object.fromEntries(
        local.split(/\n/g).map((line) => line.split("=", 2))
      );

      map.STRIPE_WEBHOOK_SECRET = secret[1];

      fs.writeFileSync(
        "./.env.local",
        Object.entries(map)
          .filter(([k, v]) => k && v)
          .map(([k, v]) => {
            return `${k}=${v}`;
          })
          .join("\n")
      );
      done = true;
      resolve();
    }
  }
  proxy.stderr.on("data", onData);
}).then(() => {
  const blitz = spawn("blitz", ["dev", ...process.argv.slice(2)]);
  blitz.stderr.pipe(process.stderr);
  blitz.stdout.pipe(process.stdout);
});
