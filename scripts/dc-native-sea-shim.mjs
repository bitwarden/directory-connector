/**
 * Shim for dc-native that works both when bundled inside a Node.js SEA (Single Executable
 * Application) and when running the bundle directly with `node build-cli/bwdc.js`.
 *
 * The real dc-native/index.js uses `import.meta.url` to resolve the .node binary path
 * relative to the package directory. Inside a SEA blob, import.meta.url points into the
 * blob (not the filesystem), so relative requires fail with ERR_MODULE_NOT_FOUND.
 *
 * - SEA: resolves the .node binary relative to process.execPath (the SEA binary itself).
 *   pack-sea.mjs copies the .node files alongside the binary, so this works at runtime.
 * - Dev (node build-cli/bwdc.js): resolves the .node binary relative to __dirname
 *   (the build-cli/ output directory). npm run build:native builds to native/ and
 *   node_modules/dc-native/ contains the built .node files, so we copy from there.
 *
 * We import createRequire from node:module and immediately assign it to a variable before
 * calling it, so that webpack's static analysis of `createRequire(arg)` calls does not
 * replace the result with `undefined` (webpack only substitutes direct createRequire() calls
 * where it can analyse the argument; an indirect call via a variable is not substituted).
 */

import * as nodeModule from "node:module";
import * as nodeSea from "node:sea";
import { dirname, join } from "node:path";

// Indirect call via variable prevents webpack from substituting the result with undefined.
const { createRequire } = nodeModule;

const platformMap = {
  "win32-x64": "dc_native.win32-x64-msvc.node",
  "darwin-arm64": "dc_native.darwin-arm64.node",
  "linux-x64": "dc_native.linux-x64-gnu.node",
  "linux-arm64": "dc_native.linux-arm64-gnu.node",
};

const key = `${process.platform}-${process.arch}`;
const nativeFile = platformMap[key];

if (!nativeFile) {
  throw new Error(`dc-native-sea-shim: unsupported platform/arch: ${key}`);
}

// When running as a SEA binary, .node files are placed next to process.execPath by pack-sea.mjs.
// When running as `node build-cli/bwdc.js`, process.argv[1] is the bundle path, so dirname
// gives us build-cli/ where copy:native:build-cli has placed the .node files.
const binaryDir = nodeSea.isSea() ? dirname(process.execPath) : dirname(process.argv[1]);
const nativePath = join(binaryDir, nativeFile);

const nativeRequire = createRequire(nativePath);
const binding = nativeRequire(nativePath);

export const { passwords } = binding;
