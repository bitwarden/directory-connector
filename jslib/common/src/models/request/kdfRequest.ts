import { KdfType } from "../../enums/kdfType";

import { PasswordRequest } from "./passwordRequest";

export class KdfRequest extends PasswordRequest {
  kdf: KdfType;
  kdfIterations: number;
}
