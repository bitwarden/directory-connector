import { SecretVerificationRequest } from "./secretVerificationRequest";

export class UpdateTwoFactorEmailRequest extends SecretVerificationRequest {
  token: string;
  email: string;
}
