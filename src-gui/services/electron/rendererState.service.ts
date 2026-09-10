import { StorageService } from "@/libs/abstractions/storage.service";
import { DirectoryType } from "@/libs/enums/directoryType";
import { IConfiguration } from "@/libs/models/IConfiguration";
import { EnvironmentUrls } from "@/libs/models/domain/environmentUrls";
import { StorageKeys } from "@/libs/models/state.model";
import { SyncConfiguration } from "@/libs/models/syncConfiguration";

/**
 * Renderer-side access to the parts of application state the UI needs.
 *
 * Credential-bearing state (auth tokens, directory secrets) is never read or written here — those
 * operations are delegated to the main process over dedicated `state:*` IPC channels. On macOS the
 * legacy file-based keychain binds each item's access control list to the signing identity of the
 * process that created it, and the renderer helper is signed under a different identity
 * (`…helper.Renderer`) than the main process. If both processes wrote the same item, whichever one
 * did not create it would fail with `errSecInvalidOwnerEdit` — surfaced to the user as
 * "invalid attempt to change the owner of this item" on login or logout.
 *
 * Non-secret preferences continue to use the plain `storage` bridge, which is backed by a JSON
 * file rather than the OS credential store and has no such ownership constraint.
 */
export class RendererStateService {
  constructor(private storageService: StorageService) {}

  getIsAuthenticated(): Promise<boolean> {
    return ipc.state.isAuthenticated();
  }

  getEntityId(): Promise<string> {
    return ipc.state.getEntityId();
  }

  getDirectoryType(): Promise<DirectoryType> {
    return ipc.state.getDirectoryType();
  }

  setDirectoryType(type: DirectoryType): Promise<void> {
    return ipc.state.setDirectoryType(type);
  }

  getDirectory<T extends IConfiguration>(type: DirectoryType): Promise<T> {
    return ipc.state.getDirectory<T>(type);
  }

  setDirectory(type: DirectoryType, config: IConfiguration): Promise<void> {
    return ipc.state.setDirectory(type, config);
  }

  // ---------------------------------------------------------------------------
  // Plain (non-credential) state — safe to read and write from this process.
  // ---------------------------------------------------------------------------

  getSync(): Promise<SyncConfiguration> {
    return this.storageService.get<SyncConfiguration>(StorageKeys.sync);
  }

  setSync(value: SyncConfiguration): Promise<void> {
    return this.storageService.save(StorageKeys.sync, value);
  }

  getSyncingDir(): Promise<boolean> {
    return this.storageService.get<boolean>(StorageKeys.syncingDir);
  }

  setSyncingDir(value: boolean): Promise<void> {
    return this.storageService.save(StorageKeys.syncingDir, value);
  }

  async getLastUserSync(): Promise<Date> {
    const value = await this.storageService.get<string>(StorageKeys.lastUserSync);
    return value ? new Date(value) : null;
  }

  async getLastGroupSync(): Promise<Date> {
    const value = await this.storageService.get<string>(StorageKeys.lastGroupSync);
    return value ? new Date(value) : null;
  }

  getEnvironmentUrls(): Promise<EnvironmentUrls> {
    return this.storageService.get<EnvironmentUrls>(StorageKeys.environmentUrls);
  }

  /**
   * Clears the sync delta/timestamp bookkeeping. Mirrors DefaultStateService.clearSyncSettings;
   * none of these keys are credentials, so they are written directly.
   */
  async clearSyncSettings(hashToo = false): Promise<void> {
    await this.storageService.remove(StorageKeys.userDelta);
    await this.storageService.remove(StorageKeys.groupDelta);
    await this.storageService.remove(StorageKeys.lastGroupSync);
    await this.storageService.remove(StorageKeys.lastUserSync);
    if (hashToo) {
      await this.storageService.remove(StorageKeys.lastSyncHash);
    }
  }
}
