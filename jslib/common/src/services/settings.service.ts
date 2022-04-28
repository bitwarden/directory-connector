import { SettingsService as SettingsServiceAbstraction } from "../abstractions/settings.service";
import { StateService } from "../abstractions/state.service";

const Keys = {
  settingsPrefix: "settings_",
  equivalentDomains: "equivalentDomains",
};

export class SettingsService implements SettingsServiceAbstraction {
  constructor(private stateService: StateService) {}

  async clearCache(): Promise<void> {
    await this.stateService.setSettings(null);
  }

  getEquivalentDomains(): Promise<any> {
    return this.getSettingsKey(Keys.equivalentDomains);
  }

  async setEquivalentDomains(equivalentDomains: string[][]): Promise<void> {
    await this.setSettingsKey(Keys.equivalentDomains, equivalentDomains);
  }

  async clear(userId?: string): Promise<void> {
    await this.stateService.setSettings(null, { userId: userId });
  }

  // Helpers

  private async getSettings(): Promise<any> {
    const settings = await this.stateService.getSettings();
    if (settings == null) {
      // eslint-disable-next-line
      const userId = await this.stateService.getUserId();
    }
    return settings;
  }

  private async getSettingsKey(key: string): Promise<any> {
    const settings = await this.getSettings();
    if (settings != null && settings[key]) {
      return settings[key];
    }
    return null;
  }

  private async setSettingsKey(key: string, value: any): Promise<void> {
    let settings = await this.getSettings();
    if (!settings) {
      settings = {};
    }

    settings[key] = value;
    await this.stateService.setSettings(settings);
  }
}
