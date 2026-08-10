const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const expoCli = require.resolve("expo/bin/cli", { paths: [root] });
const output = path.join(root, "release", "vercel-3.0.6", "site");
const result = spawnSync(process.execPath, [expoCli, "export", "--platform", "web", "--output-dir", output], {
  cwd: root,
  env: process.env,
  stdio: "inherit"
});
process.exitCode = result.status ?? 1;
