import { SecretVerificationRequest } from "./secretVerificationRequest";

export class UpdateTwoFactorWebAuthnRequest extends SecretVerificationRequest {
  deviceResponse: PublicKeyCredential;
  name: string;
  id: number;
}
