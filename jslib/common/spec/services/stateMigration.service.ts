import { Arg, Substitute, SubstituteOf } from "@fluffy-spoon/substitute";

import { StorageService } from "jslib-common/abstractions/storage.service";
import { StateVersion } from "jslib-common/enums/stateVersion";
import { StateFactory } from "jslib-common/factories/stateFactory";
import { Account } from "jslib-common/models/domain/account";
import { GlobalState } from "jslib-common/models/domain/globalState";
import { StateMigrationService } from "jslib-common/services/stateMigration.service";

const userId = "USER_ID";

describe("State Migration Service", () => {
  let storageService: SubstituteOf<StorageService>;
  let secureStorageService: SubstituteOf<StorageService>;
  let stateFactory: SubstituteOf<StateFactory>;

  let stateMigrationService: StateMigrationService;

  beforeEach(() => {
    storageService = Substitute.for<StorageService>();
    secureStorageService = Substitute.for<StorageService>();
    stateFactory = Substitute.for<StateFactory>();

    stateMigrationService = new StateMigrationService(
      storageService,
      secureStorageService,
      stateFactory
    );
  });

  describe("StateVersion 3 to 4 migration", async () => {
    beforeEach(() => {
      const globalVersion3: Partial<GlobalState> = {
        stateVersion: StateVersion.Three,
      };

      storageService.get("global", Arg.any()).resolves(globalVersion3);
      storageService.get("authenticatedAccounts", Arg.any()).resolves([userId]);
    });

    it("clears everBeenUnlocked", async () => {
      const accountVersion3: Account = {
        profile: {
          apiKeyClientId: null,
          convertAccountToKeyConnector: null,
          email: "EMAIL",
          emailVerified: true,
          everBeenUnlocked: true,
          hasPremiumPersonally: false,
          kdfIterations: 100000,
          kdfType: 0,
          keyHash: "KEY_HASH",
          lastSync: "LAST_SYNC",
          userId: userId,
          usesKeyConnector: false,
          forcePasswordReset: false,
        },
      };

      const expectedAccountVersion4: Account = {
        profile: {
          ...accountVersion3.profile,
        },
      };
      delete expectedAccountVersion4.profile.everBeenUnlocked;

      storageService.get(userId, Arg.any()).resolves(accountVersion3);

      await stateMigrationService.migrate();

      storageService.received(1).save(userId, expectedAccountVersion4, Arg.any());
    });

    it("updates StateVersion number", async () => {
      await stateMigrationService.migrate();

      storageService.received(1).save(
        "global",
        Arg.is((globals: GlobalState) => globals.stateVersion === StateVersion.Four),
        Arg.any()
      );
    });
  });
});
