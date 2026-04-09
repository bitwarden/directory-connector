#!/usr/bin/env node
/**
 * Pack the CLI binary using Node.js SEA (Single Executable Applications).
 * Requires Node 25.5+ for the --build-sea flag.
 *
 * Uses the official Node.js binary (downloaded if needed) as the base, since
 * package-manager-installed Node binaries (e.g. Homebrew) may lack the SEA
 * fuse sentinel required by --build-sea.
 *
 * macOS x64 (Intel) exception: --build-sea uses lief internally to inject the
 * SEA blob, which corrupts the Mach-O thread-local variable metadata on x64 and
 * causes dyld to abort with "unsupported thread-local, larger than 4GB" at
 * startup (exit 139). This is a known Node.js issue that the maintainers consider
 * unfixable for macOS x64:
 *   https://github.com/nodejs/node/issues/59553
 *   https://github.com/nodejs/build/issues/4083#issuecomment-3326864780
 * For macOS x64 we use the manual injection path instead:
 *   1. --experimental-sea-config generates the prep blob
 *   2. postject injects it via a different mechanism that avoids the lief bug
 *   3. codesign --sign - --force re-signs the result
 * This is the approach documented at:
 *   https://nodejs.org/docs/latest-v25.x/api/single-executable-applications.html#injecting-the-preparation-blob-manually
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

// --experimental-sea-config writes the prep blob to a file; --build-sea writes the
// final binary directly. Use separate output paths accordingly.
const blobPath = join(repoRoot, `sea-prep.${platform}.blob`);

const seaConfig = {
  main: "./build-cli/bwdc.js",
  // For --experimental-sea-config (macOS x64) the output is the prep blob path.
  // For --build-sea (all other platforms) it is the final binary path.
  output: platform === "macos" ? blobPath : outputBinary,
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

  if (platform === "macos") {
    // macOS x64: use manual injection via postject to avoid the lief-induced dyld crash.
    // See the module comment for full context.

    // Step 1: generate the SEA prep blob.
    execFileSync(officialNode, [`--experimental-sea-config`, tempSeaConfig], {
      cwd: repoRoot,
      stdio: "inherit",
    });

    // Step 2: copy the official node binary to the output path.
    copyFileSync(officialNodeBin, outputBinary);
    chmodSync(outputBinary, 0o755);

    // Step 3: remove the existing Apple signature so postject can modify the binary.
    execFileSync("codesign", ["--remove-signature", outputBinary], {
      stdio: "inherit",
    });

    // Step 4: inject the blob using postject.
    // Resource name, sentinel fuse, and segment name are required by Node.js SEA:
    // https://nodejs.org/docs/latest-v25.x/api/single-executable-applications.html#injecting-the-preparation-blob-manually
    const postjectBin = join(repoRoot, "node_modules", ".bin", "postject");
    execFileSync(
      postjectBin,
      [
        outputBinary,
        "NODE_SEA_BLOB",
        blobPath,
        "--sentinel-fuse",
        "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
        "--macho-segment-name",
        "NODE_SEA",
        "--overwrite",
      ],
      { cwd: repoRoot, stdio: "inherit" },
    );
  } else {
    execFileSync(officialNode, [`--build-sea`, tempSeaConfig], {
      cwd: repoRoot,
      stdio: "inherit",
    });
  }

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
    // --force is required because the official Node.js binary already carries an Apple
    // signature; without it codesign refuses to replace an existing signature (see Apple
    // TN2206 "Using the codesign Tool" – https://developer.apple.com/library/archive/technotes/tn2206/_index.html).
    execFileSync("codesign", ["--sign", "-", "--force", outputBinary], {
      stdio: "inherit",
    });
  }

  console.log(`Done: ${outputBinary}`);
} finally {
  rmSync(tempSeaConfig, { force: true });
  rmSync(blobPath, { force: true });
}
