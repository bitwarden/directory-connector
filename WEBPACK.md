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

`nodeIntegration: false` requires three fixes:

- **`output.globalObject: "window"`** — webpack's chunk-loading runtime uses `global` by default, which doesn't exist without nodeIntegration. This swaps it to `window`.
- **`DefinePlugin({ global: "window" })`** — same fix for `global` references inside module code.
- **`externalsPresets: { node: false, electron: false, electronRenderer: false }` + externals function** — the `electron-renderer` target auto-externalises Node built-ins as CommonJS, which breaks without `require`. Disabling the preset and replacing matched modules with `var {}` prevents the crash. These modules appear due to directory services compiled in transitively but never called from the renderer.

## Preload

Built with `tsc` directly, not webpack:

```
build:preload  →  tsc --project tsconfig.preload.json  →  scripts/preload.js
```

Must be CommonJS. Electron doesn't support ESM preloads when the renderer is sandboxed (the default with `nodeIntegration: false` + `contextIsolation: true`).
