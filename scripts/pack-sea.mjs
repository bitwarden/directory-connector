#!/usr/bin/env node
/**
 * Pack the CLI binary using Node.js SEA (Single Executable Applications).
 * Requires Node 25.5+ for the --build-sea flag.
 *
 * Uses the official Node.js binary (downloaded if needed) as the base, since
 * package-manager-installed Node binaries (e.g. Homebrew) may lack the SEA
 * fuse sentinel required by --build-sea.
 *
 * macOS x64 (Intel) exception: --build-sea and postject both use lief internally
 * to inject the SEA blob. lief corrupts the Mach-O thread-local variable metadata,
 * causing dyld to abort with "unsupported thread-local, larger than 4GB" (exit 134).
 * This affects x64 targets regardless of the host architecture running the injection.
 *   https://github.com/nodejs/node/issues/59553
 *
 * For macOS x64 we use llvm-objcopy instead. llvm-objcopy's Mach-O writer correctly
 * handles load commands without corrupting TLS metadata:
 *   https://reviews.llvm.org/D66283 (llvm-objcopy --add-section MachO support)
 *
 * Injection steps for macOS x64:
 *   1. --experimental-sea-config generates the prep blob
 *   2. llvm-objcopy --add-section injects it as the __NODE_SEA,NODE_SEA_BLOB section
 *   3. The SEA fuse sentinel is flipped from 0→1 in-place in the binary
 *   4. codesign --sign - --force re-signs the result
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
  readFileSync,
  openSync,
  writeSync,
  closeSync,
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
  // For macOS x64 (llvm-objcopy injection path) the output is the prep blob path.
  // For all other platforms (--build-sea) it is the final binary path.
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

/**
 * Find the llvm-objcopy binary. On macOS GitHub Actions runners, LLVM 17 is
 * installed via Homebrew at /usr/local/opt/llvm@17/bin/llvm-objcopy.
 * Falls back to the default llvm-objcopy on PATH.
 */
function findLlvmObjcopy() {
  const candidates = [
    "/usr/local/opt/llvm/bin/llvm-objcopy",
    "/usr/local/opt/llvm@17/bin/llvm-objcopy",
    "/usr/local/opt/llvm@18/bin/llvm-objcopy",
    "llvm-objcopy",
  ];
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "pipe" });
      console.log(`Using llvm-objcopy: ${candidate}`);
      return candidate;
    } catch {
      // not found, try next
    }
  }
  throw new Error("llvm-objcopy not found. Install LLVM via Homebrew: brew install llvm");
}

/**
 * Flip the Node.js SEA fuse sentinel in the binary from ":0" to ":1".
 * The fuse string "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2:0" must be
 * changed to ":1" to signal that a blob has been injected.
 * See: https://nodejs.org/api/single-executable-applications.html#generating-single-executable-preparation-blobs
 */
function flipSeaFuse(binaryPath) {
  const FUSE_PREFIX = Buffer.from("NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2:");
  const data = readFileSync(binaryPath);
  const idx = data.indexOf(FUSE_PREFIX);
  if (idx === -1) {
    throw new Error(`SEA fuse sentinel not found in ${binaryPath}. Is this a Node.js binary?`);
  }
  const fuseByteOffset = idx + FUSE_PREFIX.length;
  if (data[fuseByteOffset] !== 0x30 /* "0" */) {
    throw new Error(
      `SEA fuse is not "0" at offset ${fuseByteOffset} (found 0x${data[fuseByteOffset].toString(16)}). Already flipped?`,
    );
  }
  const fd = openSync(binaryPath, "r+");
  try {
    writeSync(fd, Buffer.from([0x31 /* "1" */]), 0, 1, fuseByteOffset);
  } finally {
    closeSync(fd);
  }
  console.log(`SEA fuse flipped at offset ${fuseByteOffset}`);
}

try {
  console.log(`Building SEA binary for ${platform}...`);
  console.log(`Output: ${outputBinary}`);

  const officialNode = ensureOfficialNodeBinary();

  if (platform === "macos") {
    // macOS x64: use llvm-objcopy injection to avoid the lief-induced dyld crash.
    // See the module comment for full context.

    // Step 1: generate the SEA prep blob.
    execFileSync(officialNode, [`--experimental-sea-config`, tempSeaConfig], {
      cwd: repoRoot,
      stdio: "inherit",
    });

    // Step 2: copy the official node binary to the output path.
    copyFileSync(officialNodeBin, outputBinary);
    chmodSync(outputBinary, 0o755);

    // Step 3: remove the existing Apple signature so we can modify the binary.
    execFileSync("codesign", ["--remove-signature", outputBinary], {
      stdio: "inherit",
    });

    // Step 4: inject the blob using llvm-objcopy.
    // llvm-objcopy --add-section uses LLVM's own Mach-O writer which correctly
    // preserves TLS load commands that lief (used by --build-sea and postject) corrupts.
    // Section must be named __NODE_SEA,NODE_SEA_BLOB as required by Node.js SEA.
    // LLVM 17 is available on the macOS 15 GitHub Actions runner.
    const llvmObjcopy = findLlvmObjcopy();
    execFileSync(
      llvmObjcopy,
      ["--add-section", `__NODE_SEA,NODE_SEA_BLOB=${blobPath}`, outputBinary],
      { stdio: "inherit" },
    );

    // Step 5: flip the SEA fuse sentinel from 0 to 1 in-place.
    // Node.js checks for this sentinel to know a blob has been injected.
    // The fuse string ends with ":0" which must be changed to ":1".
    flipSeaFuse(outputBinary);
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
    // --no-strict is required when using llvm-objcopy for injection on macOS x64: the
    // added __NODE_SEA segment causes codesign's strict structural checks to fail with
    // "internal error in Code Signing subsystem".
    const codesignArgs = ["--sign", "-", "--force"];
    if (platform === "macos") codesignArgs.push("--no-strict");
    codesignArgs.push(outputBinary);
    execFileSync("codesign", codesignArgs, { stdio: "inherit" });
  }

  console.log(`Done: ${outputBinary}`);
} finally {
  rmSync(tempSeaConfig, { force: true });
  rmSync(blobPath, { force: true });
}
