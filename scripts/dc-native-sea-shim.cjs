/**
 * Shim for dc-native when bundled inside a Node.js SEA (Single Executable Application).
 *
 * The real dc-native/index.js uses `import.meta.url` to resolve the .node binary path
 * relative to the package directory. Inside a SEA blob, import.meta.url points into the
 * blob (not the filesystem), so relative requires fail with ERR_MODULE_NOT_FOUND.
 *
 * This shim resolves the .node binary relative to process.execPath (the SEA binary itself).
 * pack-sea.mjs copies the .node files alongside the binary, so this works at runtime.
 */

const path = require("node:path");

const binaryDir = path.dirname(process.execPath);

const platformMap = {
  "win32-x64": "dc_native.win32-x64-msvc.node",
  "darwin-x64": "dc_native.darwin-x64.node",
  "darwin-arm64": "dc_native.darwin-arm64.node",
  "linux-x64": "dc_native.linux-x64-gnu.node",
  "linux-arm64": "dc_native.linux-arm64-gnu.node",
};

const key = `${process.platform}-${process.arch}`;
const nativeFile = platformMap[key];

if (!nativeFile) {
  throw new Error(`dc-native-sea-shim: unsupported platform/arch: ${key}`);
}

const nativePath = path.join(binaryDir, nativeFile);
const binding = require(nativePath);

const { passwords } = binding;
module.exports = { passwords };
