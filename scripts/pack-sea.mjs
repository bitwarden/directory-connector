#!/usr/bin/env node
/**
 * Pack the CLI binary using Node.js SEA (Single Executable Applications).
 * Requires Node 25.5+ for the --build-sea flag.
 *
 * Uses the currently-running Node binary (process.execPath) as both the runtime
 * and the SEA base template. Each platform is built on its native CI runner
 * so process.execPath is already the correct official binary for the target platform.
 *
 * Usage: node scripts/pack-sea.mjs <platform>
 * Platforms: linux, macos-arm64, windows
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, readdirSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");

const platform = process.argv[2];
const validPlatforms = ["linux", "macos-arm64", "windows"];

if (!platform || !validPlatforms.includes(platform)) {
  console.error(`Usage: node scripts/pack-sea.mjs <platform>`);
  console.error(`Platforms: ${validPlatforms.join(", ")}`);
  process.exit(1);
}

const binaryName = platform === "windows" ? "bwdc.exe" : "bwdc";
const outputDir = join(repoRoot, "dist-cli", platform);
const outputBinary = join(outputDir, binaryName);
const tempSeaConfig = join(repoRoot, `sea-config.${platform}.json`);

mkdirSync(outputDir, { recursive: true });

const seaConfig = {
  main: "./build-cli/bwdc.js",
  output: outputBinary,
  mainFormat: "module",
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: false,
  assets: {
    "locales/en/messages.json": "./src-gui/locales/en/messages.json",
  },
};

writeFileSync(tempSeaConfig, JSON.stringify(seaConfig, null, 2));

try {
  console.log(`Building CLI for ${platform}...`);
  console.log(`Output: ${outputDir}`);

  execFileSync(process.execPath, [`--build-sea`, tempSeaConfig], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  // Copy native .node addons from node_modules/dc-native/ to the output dir so they sit
  // alongside the binary with their canonical names (e.g. dc_native.darwin-x64.node).
  const dcNativeDir = join(repoRoot, "node_modules", "dc-native");
  const copiedNativeAddons = [];
  for (const file of readdirSync(dcNativeDir)) {
    if (file.endsWith(".node")) {
      const destPath = join(outputDir, file);
      copyFileSync(join(dcNativeDir, file), destPath);
      copiedNativeAddons.push(destPath);
      console.log(`Copied native addon: ${file}`);
    }
  }

  if (platform === "macos-arm64") {
    for (const addonPath of copiedNativeAddons) {
      console.log(`Ad-hoc signing native addon: ${addonPath}`);
      execFileSync("codesign", ["--sign", "-", "--force", addonPath], {
        stdio: "inherit",
      });
    }

    console.log("Ad-hoc signing binary...");
    // --force is required because the official Node.js binary already carries an Apple
    // signature; without it codesign refuses to replace an existing signature (see Apple
    // TN2206 "Using the codesign Tool" – https://developer.apple.com/library/archive/technotes/tn2206/_index.html).
    execFileSync("codesign", ["--sign", "-", "--force", outputBinary], {
      stdio: "inherit",
    });
  }

  console.log(`Done: ${outputDir}`);
} finally {
  rmSync(tempSeaConfig, { force: true });
}
