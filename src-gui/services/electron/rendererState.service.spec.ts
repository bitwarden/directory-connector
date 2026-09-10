import { mock, MockProxy } from "jest-mock-extended";

import { StorageService } from "@/libs/abstractions/storage.service";
import { DirectoryType } from "@/libs/enums/directoryType";
import { StorageKeys } from "@/libs/models/state.model";

import { RendererStateService } from "./rendererState.service";

/**
 * The renderer must reach credential-bearing state only through IPC. On macOS the legacy keychain
 * binds each item's ACL to the creating binary's signing identity, and the renderer helper is a
 * different identity from the main process, so a renderer-side write fails with
 * errSecInvalidOwnerEdit ("invalid attempt to change the owner of this item").
 */
describe("RendererStateService", () => {
  let storageService: MockProxy<StorageService>;
  let sut: RendererStateService;
  let ipcState: {
    isAuthenticated: jest.Mock;
    getEntityId: jest.Mock;
    getDirectoryType: jest.Mock;
    setDirectoryType: jest.Mock;
    getDirectory: jest.Mock;
    setDirectory: jest.Mock;
  };

  beforeEach(() => {
    storageService = mock<StorageService>();
    ipcState = {
      isAuthenticated: jest.fn().mockResolvedValue(true),
      getEntityId: jest.fn().mockResolvedValue("entity-id"),
      getDirectoryType: jest.fn().mockResolvedValue(DirectoryType.Ldap),
      setDirectoryType: jest.fn().mockResolvedValue(undefined),
      getDirectory: jest.fn().mockResolvedValue({ id: "cfg" }),
      setDirectory: jest.fn().mockResolvedValue(undefined),
    };
    (globalThis as any).ipc = { state: ipcState };

    sut = new RendererStateService(storageService);
  });

  afterEach(() => {
    delete (globalThis as any).ipc;
  });

  describe("credential-bearing state", () => {
    it("delegates the authentication check to the main process", async () => {
      await expect(sut.getIsAuthenticated()).resolves.toBe(true);

      expect(ipcState.isAuthenticated).toHaveBeenCalledTimes(1);
      expect(storageService.get).not.toHaveBeenCalled();
    });

    it("delegates directory reads to the main process rather than reading storage", async () => {
      await sut.getDirectory(DirectoryType.Ldap);

      expect(ipcState.getDirectory).toHaveBeenCalledWith(DirectoryType.Ldap);
      expect(storageService.get).not.toHaveBeenCalled();
    });

    it("delegates directory writes to the main process rather than writing storage", async () => {
      const config = { id: "cfg", password: "secret" } as any;

      await sut.setDirectory(DirectoryType.Ldap, config);

      expect(ipcState.setDirectory).toHaveBeenCalledWith(DirectoryType.Ldap, config);
      expect(storageService.save).not.toHaveBeenCalled();
    });

    it("delegates the entity id and directory type to the main process", async () => {
      await sut.getEntityId();
      await sut.getDirectoryType();
      await sut.setDirectoryType(DirectoryType.Okta);

      expect(ipcState.getEntityId).toHaveBeenCalledTimes(1);
      expect(ipcState.getDirectoryType).toHaveBeenCalledTimes(1);
      expect(ipcState.setDirectoryType).toHaveBeenCalledWith(DirectoryType.Okta);
      expect(storageService.get).not.toHaveBeenCalled();
      expect(storageService.save).not.toHaveBeenCalled();
    });
  });

  describe("plain state", () => {
    it("reads sync configuration straight from plain storage", async () => {
      storageService.get.mockResolvedValue({ interval: 5 } as never);

      await expect(sut.getSync()).resolves.toEqual({ interval: 5 });
      expect(storageService.get).toHaveBeenCalledWith(StorageKeys.sync);
    });

    it("writes sync configuration straight to plain storage", async () => {
      const sync = { interval: 10 } as any;

      await sut.setSync(sync);

      expect(storageService.save).toHaveBeenCalledWith(StorageKeys.sync, sync);
    });

    it("converts stored sync timestamps back into dates", async () => {
      storageService.get.mockResolvedValue("2026-01-02T03:04:05.000Z" as never);

      await expect(sut.getLastUserSync()).resolves.toEqual(new Date("2026-01-02T03:04:05.000Z"));
    });

    it("returns null when a sync timestamp is absent", async () => {
      storageService.get.mockResolvedValue(null as never);

      await expect(sut.getLastGroupSync()).resolves.toBeNull();
    });

    it("clears delta and timestamp keys, keeping the hash unless asked", async () => {
      await sut.clearSyncSettings();

      expect(storageService.remove).toHaveBeenCalledWith(StorageKeys.userDelta);
      expect(storageService.remove).toHaveBeenCalledWith(StorageKeys.groupDelta);
      expect(storageService.remove).toHaveBeenCalledWith(StorageKeys.lastGroupSync);
      expect(storageService.remove).toHaveBeenCalledWith(StorageKeys.lastUserSync);
      expect(storageService.remove).not.toHaveBeenCalledWith(StorageKeys.lastSyncHash);
    });

    it("clears the sync hash when requested", async () => {
      await sut.clearSyncSettings(true);

      expect(storageService.remove).toHaveBeenCalledWith(StorageKeys.lastSyncHash);
    });
  });
});
