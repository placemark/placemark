/* eslint-disable @typescript-eslint/no-var-requires */
const Fs = require("fs");
const Path = require("path");

const packagePath = Path.join(__dirname, "../package.json");

const statsPath = Path.join(__dirname, "../.next/stats.json");
const stats = JSON.parse(Fs.readFileSync(statsPath));
const package = JSON.parse(Fs.readFileSync(packagePath));

const output = [];

output.push(
  `m package_dependency_count=${Object.values(package.dependencies).length}u`
);

output.push(
  `m package_dev_dependency_count=${
    Object.values(package.devDependencies).length
  }u`
);

output.push(
  `m bundle_entrypoint_count=${Object.values(stats.entrypoints).length}u`
);
output.push(`m bundle_chunk_count=${Object.values(stats.chunks).length}u`);

let chunkTotal = 0;
let chunkCount = 0;

for (const chunk of stats.chunks) {
  let id = chunk.files[0];
  if (!id) continue;
  id = id.split(".")[0].replace(/(-[0-9a-fA-F]{20}$)/, "");
  output.push(`m,id=${id} chunk_size=${chunk.size}u`);
  chunkTotal += chunk.size;
  chunkCount++;
}

output.push(`m chunk_sum=${chunkTotal}u`);
output.push(`m chunk_count=${chunkCount}u`);

output.push(
  `m bundle_entrypoint_count=${Object.values(stats.entrypoints).length}u`
);

// eslint-disable-next-line no-console
console.log(output.join("\n"));
