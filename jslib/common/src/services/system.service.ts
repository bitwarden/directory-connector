import { MessagingService } from "../abstractions/messaging.service";
import { PlatformUtilsService } from "../abstractions/platformUtils.service";
import { StateService } from "../abstractions/state.service";
import { SystemService as SystemServiceAbstraction } from "../abstractions/system.service";
import { Utils } from "../misc/utils";

export class SystemService implements SystemServiceAbstraction {
  private reloadInterval: any = null;
  private clearClipboardTimeout: any = null;
  private clearClipboardTimeoutFunction: () => Promise<any> = null;

  constructor(
    private messagingService: MessagingService,
    private platformUtilsService: PlatformUtilsService,
    private reloadCallback: () => Promise<void> = null,
    private stateService: StateService
  ) {}

  async startProcessReload(): Promise<void> {
    if (
      (await this.stateService.getDecryptedPinProtected()) != null ||
      (await this.stateService.getBiometricLocked()) ||
      this.reloadInterval != null
    ) {
      return;
    }
    this.cancelProcessReload();
    this.reloadInterval = setInterval(async () => {
      let doRefresh = false;
      const lastActive = await this.stateService.getLastActive();
      if (lastActive != null) {
        const diffSeconds = new Date().getTime() - lastActive;
        // Don't refresh if they are still active in the window
        doRefresh = diffSeconds >= 5000;
      }
      const biometricLockedFingerprintValidated =
        (await this.stateService.getBiometricFingerprintValidated()) &&
        (await this.stateService.getBiometricLocked());
      if (doRefresh && !biometricLockedFingerprintValidated) {
        clearInterval(this.reloadInterval);
        this.reloadInterval = null;
        this.messagingService.send("reloadProcess");
        if (this.reloadCallback != null) {
          await this.reloadCallback();
        }
      }
    }, 10000);
  }

  cancelProcessReload(): void {
    if (this.reloadInterval != null) {
      clearInterval(this.reloadInterval);
      this.reloadInterval = null;
    }
  }

  async clearClipboard(clipboardValue: string, timeoutMs: number = null): Promise<void> {
    if (this.clearClipboardTimeout != null) {
      clearTimeout(this.clearClipboardTimeout);
      this.clearClipboardTimeout = null;
    }
    if (Utils.isNullOrWhitespace(clipboardValue)) {
      return;
    }
    await this.stateService.getClearClipboard().then((clearSeconds) => {
      if (clearSeconds == null) {
        return;
      }
      if (timeoutMs == null) {
        timeoutMs = clearSeconds * 1000;
      }
      this.clearClipboardTimeoutFunction = async () => {
        const clipboardValueNow = await this.platformUtilsService.readFromClipboard();
        if (clipboardValue === clipboardValueNow) {
          this.platformUtilsService.copyToClipboard("", { clearing: true });
        }
      };
      this.clearClipboardTimeout = setTimeout(async () => {
        await this.clearPendingClipboard();
      }, timeoutMs);
    });
  }

  async clearPendingClipboard() {
    if (this.clearClipboardTimeoutFunction != null) {
      await this.clearClipboardTimeoutFunction();
      this.clearClipboardTimeoutFunction = null;
    }
  }
}
