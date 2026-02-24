const { existsSync } = require("fs");
const { join } = require("path");

const { platform, arch } = process;

let nativeBinding = null;
let loadError = null;

function loadFirstAvailable(localFiles) {
  for (const localFile of localFiles) {
    const filePath = join(__dirname, localFile);
    if (existsSync(filePath)) {
      return require(filePath);
    }
  }
  throw new Error(`Could not find dc-native binary. Run 'npm run build:native' to compile it.`);
}

switch (platform) {
  case "win32":
    switch (arch) {
      case "x64":
        nativeBinding = loadFirstAvailable(["dc_native.win32-x64-msvc.node"]);
        break;
      case "arm64":
        nativeBinding = loadFirstAvailable(["dc_native.win32-arm64-msvc.node"]);
        break;
      default:
        throw new Error(`Unsupported architecture on Windows: ${arch}`);
    }
    break;
  case "darwin":
    switch (arch) {
      case "x64":
        nativeBinding = loadFirstAvailable(["dc_native.darwin-x64.node"]);
        break;
      case "arm64":
        nativeBinding = loadFirstAvailable(["dc_native.darwin-arm64.node"]);
        break;
      default:
        throw new Error(`Unsupported architecture on macOS: ${arch}`);
    }
    break;
  case "linux":
    switch (arch) {
      case "x64":
        nativeBinding = loadFirstAvailable(["dc_native.linux-x64-gnu.node"]);
        break;
      case "arm64":
        nativeBinding = loadFirstAvailable(["dc_native.linux-arm64-gnu.node"]);
        break;
      default:
        throw new Error(`Unsupported architecture on Linux: ${arch}`);
    }
    break;
  default:
    throw new Error(`Unsupported platform: ${platform}, architecture: ${arch}`);
}

if (!nativeBinding) {
  if (loadError) {
    throw loadError;
  }
  throw new Error(`Failed to load dc-native binding`);
}

module.exports = nativeBinding;
