export abstract class StateMigrationService {
  needsMigration: () => Promise<boolean>;
  migrate: () => Promise<void>;
}
