import { SecretVerificationRequest } from "./secretVerificationRequest";

export class EmailTokenRequest extends SecretVerificationRequest {
  newEmail: string;
  masterPasswordHash: string;
}
