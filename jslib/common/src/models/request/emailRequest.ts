import { EmailTokenRequest } from "./emailTokenRequest";

export class EmailRequest extends EmailTokenRequest {
  newMasterPasswordHash: string;
  token: string;
  key: string;
}
