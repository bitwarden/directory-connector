import { existsSync } from "fs";
import { dirname, join } from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const { platform, arch } = process;

let nativeBinding = null;

function loadFirstAvailable(localFiles) {
  for (const localFile of localFiles) {
    // Resolve from import.meta.url, then rewrite asar paths to asar.unpacked for .node files
    let filePath = join(decodeURIComponent(new URL(".", import.meta.url).pathname), localFile);
    filePath = filePath.replace(/\.asar([/\\])/, ".asar.unpacked$1");
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
  throw new Error(`Failed to load dc-native binding`);
}

export const { passwords } = nativeBinding;
export default nativeBinding;
