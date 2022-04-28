export abstract class SettingsService {
  clearCache: () => Promise<void>;
  getEquivalentDomains: () => Promise<any>;
  setEquivalentDomains: (equivalentDomains: string[][]) => Promise<any>;
  clear: (userId?: string) => Promise<void>;
}
