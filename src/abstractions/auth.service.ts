import { AuthResult } from "@/jslib/common/src/models/domain/authResult";
import {
  ApiLogInCredentials,
  PasswordLogInCredentials,
  SsoLogInCredentials,
} from "@/jslib/common/src/models/domain/logInCredentials";

export abstract class AuthService {
  logIn: (
    credentials: ApiLogInCredentials | PasswordLogInCredentials | SsoLogInCredentials,
  ) => Promise<AuthResult>;
  logOut: (callback: () => void) => void;
}
