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
  throw new Error(
    `Could not find dc-native binary for ${platform}-${arch}. Run 'npm run build:native' to compile it.`,
  );
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

// Re-export flat native symbols as the `passwords` namespace so all
// TypeScript callers (and the existing index.d.ts declarations) work unchanged.
module.exports = {
  passwords: {
    getPassword: (service, account) => nativeBinding.getPassword(service, account),
    setPassword: (service, account, password) =>
      nativeBinding.setPassword(service, account, password),
    deletePassword: (service, account) => nativeBinding.deletePassword(service, account),
    isAvailable: () => nativeBinding.isAvailable(),
    migrateKeytarPassword: (service, account) =>
      nativeBinding.migrateKeytarPassword(service, account),
    PASSWORD_NOT_FOUND: "Password not found.",
  },
};
