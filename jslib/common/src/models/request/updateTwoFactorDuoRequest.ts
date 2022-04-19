import { SecretVerificationRequest } from "./secretVerificationRequest";

export class UpdateTwoFactorDuoRequest extends SecretVerificationRequest {
  integrationKey: string;
  secretKey: string;
  host: string;
}
