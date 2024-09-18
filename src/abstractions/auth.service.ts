import {
  ApiLogInCredentials,
  PasswordLogInCredentials,
  SsoLogInCredentials,
} from "@/jslib/common/src/models/domain/logInCredentials";

export abstract class AuthService {
  logIn: (
    credentials: ApiLogInCredentials | PasswordLogInCredentials | SsoLogInCredentials,
  ) => Promise<void>;
  logOut: (callback: () => void) => void;
}
