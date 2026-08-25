# Electron Services

`nodeIntegration: false` + `contextIsolation: true`

All Node/Electron APIs cross the IPC bridge via `src-gui/preload.ts`.

## Process split

**Main** (`src-gui/main.ts` instantiates everything):

- `electronLog.service.ts` — file logger
- `electronMainMessaging.service.ts` — registers core `ipcMain.handle` channels
- `electronMainPlatformUtils.service.ts` — minimal `PlatformUtilsService` for main (used by `NodeApiService`/`AuthService`)
- `electronStorage.service.ts` — plain storage via `electron-store`

**Renderer** :

- `electronPlatformUtils.service.ts` — reads `process.*` via `window.ipc.process`
- `electronRendererMessaging.service.ts` — app command bus over `messagingService` channel
- `electronRendererStorage.service.ts` — proxies plain storage via `storageService` channel
- `electronRendererSecureStorage.service.ts` — proxies keychain via `secureStorageService` channel

## IPC channels

| Channel                | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `storageService`       | Plain data (electron-store)               |
| `secureStorageService` | Keychain via `NativeSecureStorageService` |
| `auth:checkTokens`     | Returns `{ accessToken, organizationId }` |
| `auth:login`           | `AuthService.logIn()`                     |
| `auth:logout`          | Clears auth tokens                        |
| `sync:run`             | `SyncService.sync(force, test)`           |
| `appVersion`           | `app.getVersion()`                        |
| `systemTheme`          | Current theme                             |
| `showMessageBox`       | Native dialog                             |
| `openContextMenu`      | Native context menu                       |
| `messagingService`     | Bidirectional app command bus             |

## What lives in main

`NodeCryptoFunctionService`, `NodeApiService`, `AuthService`, `SyncService`, `DefaultDirectoryFactoryService`, `NativeSecureStorageService`, `StateMigrationService`, `TokenService` — anything that needs Node. The renderer accesses results via IPC.
