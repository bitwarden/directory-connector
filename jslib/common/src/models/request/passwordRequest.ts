import { SecretVerificationRequest } from "./secretVerificationRequest";

export class PasswordRequest extends SecretVerificationRequest {
  newMasterPasswordHash: string;
  key: string;
}
