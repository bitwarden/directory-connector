# Electron Services

`nodeIntegration: false` + `contextIsolation: true`

All Node/Electron APIs cross the IPC bridge via `src-gui/preload.ts`.

## Process split

**Main**

- `electronLog.service.ts` — file logger (electron-log)
- `electronMainMessaging.service.ts` — registers `ipcMain.handle` channels for `appVersion`, `showMessageBox`
- `mainPlatformUtils.service.ts` — minimal `PlatformUtilsService` for main (used by `NodeApiService`/`AuthService`)
- `electronStorage.service.ts` — plain storage via `electron-store`

**Renderer**

- `rendererAuth.service.ts` — `auth:login`, `auth:logout`
- `rendererI18n.service.ts` — loads locales via `fetch`
- `rendererLog.service.ts` — forwards log writes to main via `log` channel
- `rendererMessaging.service.ts` — app command bus over `messagingService` channel
- `rendererPlatformUtils.service.ts` — reads `process.*` and `platform.*` via bridge
- `rendererSecureStorage.service.ts` — proxies keychain via `secureStorageService` channel
- `rendererStorage.service.ts` — proxies plain storage via `storageService` channel
- `rendererSync.service.ts` — `sync:run`

## IPC channels

| Channel                | Direction       | Purpose                                     |
| ---------------------- | --------------- | ------------------------------------------- |
| `log`                  | renderer → main | Forward renderer log writes to electron-log |
| `storageService`       | renderer → main | electron-store access                       |
| `secureStorageService` | renderer → main | Keychain via `NativeSecureStorageService`   |
| `auth:login`           | renderer → main | `AuthService.logIn()`                       |
| `auth:logout`          | renderer → main | Clears auth tokens                          |
| `sync:run`             | renderer → main | `SyncService.sync(force, test)`             |
| `appVersion`           | renderer → main | `app.getVersion()`                          |
| `showMessageBox`       | renderer → main | Native dialog                               |
| `messagingService`     | bidirectional   | App command bus                             |

## What lives in main

`NodeCryptoFunctionService`, `NodeApiService`, `AuthService`, `SyncService`, `DefaultDirectoryFactoryService`, `NativeSecureStorageService`, `StateMigrationService`, `TokenService`. Anything that needs Node. The renderer accesses results via IPC.
