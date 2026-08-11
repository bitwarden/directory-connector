# Webpack

Three separate configs, one per Electron process.

| Config                 | Target              | Entry                 | Output          |
| ---------------------- | ------------------- | --------------------- | --------------- |
| `webpack.main.mjs`     | `electron-main`     | `src-gui/main.ts`     | `build/main.js` |
| `webpack.renderer.mjs` | `electron-renderer` | `src-gui/app/main.ts` | `build/app/`    |
| `webpack.preload.mjs`  | (unused)            | —                     | —               |

## Main

ES module output (`outputModule: true`) to match `"type": "module"` in `package.json`. `dc-native` is externalised.

## Renderer

`nodeIntegration: false` requires:

- **`output.globalObject: "window"`** — webpack's chunk-loading runtime uses `global` by default, which doesn't exist without nodeIntegration. This swaps it to `window`.

## Preload

Must be CommonJS. Electron doesn't support ESM preloads when the renderer is sandboxed.
