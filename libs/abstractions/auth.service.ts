export abstract class AuthService {
  logIn: (credentials: { clientId: string; clientSecret: string }) => Promise<void>;
  logOut: (callback: () => void) => void;
}
