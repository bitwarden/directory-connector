import { CipherRepromptType } from "../../enums/cipherRepromptType";
import { CipherType } from "../../enums/cipherType";
import { CardApi } from "../api/cardApi";
import { FieldApi } from "../api/fieldApi";
import { IdentityApi } from "../api/identityApi";
import { LoginApi } from "../api/loginApi";
import { LoginUriApi } from "../api/loginUriApi";
import { SecureNoteApi } from "../api/secureNoteApi";
import { Cipher } from "../domain/cipher";

import { AttachmentRequest } from "./attachmentRequest";
import { PasswordHistoryRequest } from "./passwordHistoryRequest";

export class CipherRequest {
  type: CipherType;
  folderId: string;
  organizationId: string;
  name: string;
  notes: string;
  favorite: boolean;
  login: LoginApi;
  secureNote: SecureNoteApi;
  card: CardApi;
  identity: IdentityApi;
  fields: FieldApi[];
  passwordHistory: PasswordHistoryRequest[];
  // Deprecated, remove at some point and rename attachments2 to attachments
  attachments: { [id: string]: string };
  attachments2: { [id: string]: AttachmentRequest };
  lastKnownRevisionDate: Date;
  reprompt: CipherRepromptType;

  constructor(cipher: Cipher) {
    this.type = cipher.type;
    this.folderId = cipher.folderId;
    this.organizationId = cipher.organizationId;
    this.name = cipher.name ? cipher.name.encryptedString : null;
    this.notes = cipher.notes ? cipher.notes.encryptedString : null;
    this.favorite = cipher.favorite;
    this.lastKnownRevisionDate = cipher.revisionDate;
    this.reprompt = cipher.reprompt;

    switch (this.type) {
      case CipherType.Login:
        this.login = new LoginApi();
        this.login.uris = null;
        this.login.username = cipher.login.username ? cipher.login.username.encryptedString : null;
        this.login.password = cipher.login.password ? cipher.login.password.encryptedString : null;
        this.login.passwordRevisionDate =
          cipher.login.passwordRevisionDate != null
            ? cipher.login.passwordRevisionDate.toISOString()
            : null;
        this.login.totp = cipher.login.totp ? cipher.login.totp.encryptedString : null;
        this.login.autofillOnPageLoad = cipher.login.autofillOnPageLoad;

        if (cipher.login.uris != null) {
          this.login.uris = cipher.login.uris.map((u) => {
            const uri = new LoginUriApi();
            uri.uri = u.uri != null ? u.uri.encryptedString : null;
            uri.match = u.match != null ? u.match : null;
            return uri;
          });
        }
        break;
      case CipherType.SecureNote:
        this.secureNote = new SecureNoteApi();
        this.secureNote.type = cipher.secureNote.type;
        break;
      case CipherType.Card:
        this.card = new CardApi();
        this.card.cardholderName =
          cipher.card.cardholderName != null ? cipher.card.cardholderName.encryptedString : null;
        this.card.brand = cipher.card.brand != null ? cipher.card.brand.encryptedString : null;
        this.card.number = cipher.card.number != null ? cipher.card.number.encryptedString : null;
        this.card.expMonth =
          cipher.card.expMonth != null ? cipher.card.expMonth.encryptedString : null;
        this.card.expYear =
          cipher.card.expYear != null ? cipher.card.expYear.encryptedString : null;
        this.card.code = cipher.card.code != null ? cipher.card.code.encryptedString : null;
        break;
      case CipherType.Identity:
        this.identity = new IdentityApi();
        this.identity.title =
          cipher.identity.title != null ? cipher.identity.title.encryptedString : null;
        this.identity.firstName =
          cipher.identity.firstName != null ? cipher.identity.firstName.encryptedString : null;
        this.identity.middleName =
          cipher.identity.middleName != null ? cipher.identity.middleName.encryptedString : null;
        this.identity.lastName =
          cipher.identity.lastName != null ? cipher.identity.lastName.encryptedString : null;
        this.identity.address1 =
          cipher.identity.address1 != null ? cipher.identity.address1.encryptedString : null;
        this.identity.address2 =
          cipher.identity.address2 != null ? cipher.identity.address2.encryptedString : null;
        this.identity.address3 =
          cipher.identity.address3 != null ? cipher.identity.address3.encryptedString : null;
        this.identity.city =
          cipher.identity.city != null ? cipher.identity.city.encryptedString : null;
        this.identity.state =
          cipher.identity.state != null ? cipher.identity.state.encryptedString : null;
        this.identity.postalCode =
          cipher.identity.postalCode != null ? cipher.identity.postalCode.encryptedString : null;
        this.identity.country =
          cipher.identity.country != null ? cipher.identity.country.encryptedString : null;
        this.identity.company =
          cipher.identity.company != null ? cipher.identity.company.encryptedString : null;
        this.identity.email =
          cipher.identity.email != null ? cipher.identity.email.encryptedString : null;
        this.identity.phone =
          cipher.identity.phone != null ? cipher.identity.phone.encryptedString : null;
        this.identity.ssn =
          cipher.identity.ssn != null ? cipher.identity.ssn.encryptedString : null;
        this.identity.username =
          cipher.identity.username != null ? cipher.identity.username.encryptedString : null;
        this.identity.passportNumber =
          cipher.identity.passportNumber != null
            ? cipher.identity.passportNumber.encryptedString
            : null;
        this.identity.licenseNumber =
          cipher.identity.licenseNumber != null
            ? cipher.identity.licenseNumber.encryptedString
            : null;
        break;
      default:
        break;
    }

    if (cipher.fields != null) {
      this.fields = cipher.fields.map((f) => {
        const field = new FieldApi();
        field.type = f.type;
        field.name = f.name ? f.name.encryptedString : null;
        field.value = f.value ? f.value.encryptedString : null;
        field.linkedId = f.linkedId;
        return field;
      });
    }

    if (cipher.passwordHistory != null) {
      this.passwordHistory = [];
      cipher.passwordHistory.forEach((ph) => {
        this.passwordHistory.push({
          lastUsedDate: ph.lastUsedDate,
          password: ph.password ? ph.password.encryptedString : null,
        });
      });
    }

    if (cipher.attachments != null) {
      this.attachments = {};
      this.attachments2 = {};
      cipher.attachments.forEach((attachment) => {
        const fileName = attachment.fileName ? attachment.fileName.encryptedString : null;
        this.attachments[attachment.id] = fileName;
        const attachmentRequest = new AttachmentRequest();
        attachmentRequest.fileName = fileName;
        if (attachment.key != null) {
          attachmentRequest.key = attachment.key.encryptedString;
        }
        this.attachments2[attachment.id] = attachmentRequest;
      });
    }
  }
}
