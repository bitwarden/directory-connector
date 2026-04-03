import { VerificationType } from "@/libs/enums/verificationType";

export type Verification = {
  type: VerificationType;
  secret: string;
};
