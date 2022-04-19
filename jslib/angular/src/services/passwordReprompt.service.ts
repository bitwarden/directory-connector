import { Injectable } from "@angular/core";

import { KeyConnectorService } from "jslib-common/abstractions/keyConnector.service";
import { PasswordRepromptService as PasswordRepromptServiceAbstraction } from "jslib-common/abstractions/passwordReprompt.service";

import { PasswordRepromptComponent } from "../components/password-reprompt.component";

import { ModalService } from "./modal.service";

/**
 * Used to verify the user's Master Password for the "Master Password Re-prompt" feature only.
 * See UserVerificationService for any other situation where you need to verify the user's identity.
 */
@Injectable()
export class PasswordRepromptService implements PasswordRepromptServiceAbstraction {
  protected component = PasswordRepromptComponent;

  constructor(
    private modalService: ModalService,
    private keyConnectorService: KeyConnectorService
  ) {}

  protectedFields() {
    return ["TOTP", "Password", "H_Field", "Card Number", "Security Code"];
  }

  async showPasswordPrompt() {
    if (!(await this.enabled())) {
      return true;
    }

    const ref = this.modalService.open(this.component, { allowMultipleModals: true });

    if (ref == null) {
      return false;
    }

    const result = await ref.onClosedPromise();
    return result === true;
  }

  async enabled() {
    return !(await this.keyConnectorService.getUsesKeyConnector());
  }
}
