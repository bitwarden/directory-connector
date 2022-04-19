import { SecretVerificationRequest } from "./secretVerificationRequest";

export class TwoFactorEmailRequest extends SecretVerificationRequest {
  email: string;
}
