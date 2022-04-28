import { SecretVerificationRequest } from "../models/request/secretVerificationRequest";
import { Verification } from "../types/verification";

export abstract class UserVerificationService {
  buildRequest: <T extends SecretVerificationRequest>(
    verification: Verification,
    requestClass?: new () => T,
    alreadyHashed?: boolean
  ) => Promise<T>;
  verifyUser: (verification: Verification) => Promise<boolean>;
  requestOTP: () => Promise<void>;
}
