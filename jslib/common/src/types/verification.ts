import { VerificationType } from "../enums/verificationType";

export type Verification = {
  type: VerificationType;
  secret: string;
};
