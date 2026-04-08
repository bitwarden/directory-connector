#!/usr/bin/env node
/**
 * Pack the CLI binary using Node.js SEA (Single Executable Applications).
 * Requires Node 25.5+ for the --build-sea flag.
 *
 * Uses the official Node.js binary (downloaded if needed) as the base, since
 * package-manager-installed Node binaries (e.g. Homebrew) may lack the SEA
 * fuse sentinel required by --build-sea.
 *
 * Usage: node scripts/pack-sea.mjs <platform>
 * Platforms: linux, macos, macos-arm64, windows
 */

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  copyFileSync,
  chmodSync,
  readdirSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");

const platform = process.argv[2];
const validPlatforms = ["linux", "macos", "macos-arm64", "windows"];

if (!platform || !validPlatforms.includes(platform)) {
  console.error(`Usage: node scripts/pack-sea.mjs <platform>`);
  console.error(`Platforms: ${validPlatforms.join(", ")}`);
  process.exit(1);
}

const nodeVersion = process.version; // e.g. "v25.9.0"
const binaryName = platform === "windows" ? "bwdc.exe" : "bwdc";
const outputDir = join(repoRoot, "dist-cli", platform);
const outputBinary = join(outputDir, binaryName);
const tempSeaConfig = join(repoRoot, `sea-config.${platform}.json`);
const officialNodeCache = join(repoRoot, ".node-sea-base");
const officialNodeBin = join(officialNodeCache, `node-${nodeVersion}-${platform}`);

mkdirSync(outputDir, { recursive: true });
mkdirSync(officialNodeCache, { recursive: true });

/**
 * Download the official Node.js binary for the current version/platform.
 * Cached in .node-sea-base/ to avoid re-downloading on every pack.
 */
function ensureOfficialNodeBinary() {
  if (existsSync(officialNodeBin)) {
    console.log(`Using cached official Node binary: ${officialNodeBin}`);
    return officialNodeBin;
  }

  const ver = nodeVersion.replace(/^v/, "");

  // Map our platform names to Node.js release archive names
  const platformMap = {
    linux: { os: "linux", arch: "x64", ext: "tar.gz", binPath: `node-v${ver}-linux-x64/bin/node` },
    macos: {
      os: "darwin",
      arch: "x64",
      ext: "tar.gz",
      binPath: `node-v${ver}-darwin-x64/bin/node`,
    },
    "macos-arm64": {
      os: "darwin",
      arch: "arm64",
      ext: "tar.gz",
      binPath: `node-v${ver}-darwin-arm64/bin/node`,
    },
    windows: { os: "win", arch: "x64", ext: "zip", binPath: `node-v${ver}-win-x64/node.exe` },
  };

  const { os, arch, ext, binPath } = platformMap[platform];
  const archiveName = `node-v${ver}-${os}-${arch}.${ext}`;
  const downloadUrl = `https://nodejs.org/dist/v${ver}/${archiveName}`;
  const archivePath = join(officialNodeCache, archiveName);

  console.log(`Downloading official Node.js ${nodeVersion} binary...`);
  console.log(`  URL: ${downloadUrl}`);

  execFileSync("curl", ["-fsSL", "-o", archivePath, downloadUrl], {
    stdio: "inherit",
  });

  console.log("Extracting node binary...");
  if (ext === "tar.gz") {
    // binPath is e.g. "node-v25.9.0-darwin-arm64/bin/node" — strip 2 components to get just "node"
    execFileSync(
      "tar",
      ["-xzf", archivePath, "-C", officialNodeCache, "--strip-components=2", binPath],
      {
        stdio: "inherit",
      },
    );
    const extracted = join(officialNodeCache, "node");
    copyFileSync(extracted, officialNodeBin);
    rmSync(extracted, { force: true });
  } else {
    // windows zip - just use the archive binary directly for now
    execFileSync("unzip", ["-j", archivePath, binPath, "-d", officialNodeCache], {
      stdio: "inherit",
    });
    const extracted = join(officialNodeCache, "node.exe");
    copyFileSync(extracted, officialNodeBin);
    rmSync(extracted, { force: true });
  }

  chmodSync(officialNodeBin, 0o755);
  rmSync(archivePath, { force: true });

  console.log(`Official Node binary cached at: ${officialNodeBin}`);
  return officialNodeBin;
}

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
  console.log(`Building SEA binary for ${platform}...`);
  console.log(`Output: ${outputBinary}`);

  const officialNode = ensureOfficialNodeBinary();

  execFileSync(officialNode, [`--build-sea`, tempSeaConfig], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  // Copy native .node addons from node_modules/dc-native/ to the output dir so they sit
  // alongside the binary with their canonical names (e.g. dc_native.darwin-x64.node).
  // The bundled dc-native index.js chunk uses require('./dc_native.<platform>.node') at
  // runtime, resolving relative to the binary location, so the canonical name must match.
  // build-cli/ only has webpack-hashed copies (e.g. bf4a17...node) which won't match.
  const dcNativeDir = join(repoRoot, "node_modules", "dc-native");
  for (const file of readdirSync(dcNativeDir)) {
    if (file.endsWith(".node")) {
      copyFileSync(join(dcNativeDir, file), join(outputDir, file));
      console.log(`Copied native addon: ${file}`);
    }
  }

  if (platform === "macos" || platform === "macos-arm64") {
    console.log("Ad-hoc signing binary...");
    execFileSync("codesign", ["--sign", "-", outputBinary], {
      stdio: "inherit",
    });
  }

  console.log(`Done: ${outputBinary}`);
} finally {
  rmSync(tempSeaConfig, { force: true });
}
