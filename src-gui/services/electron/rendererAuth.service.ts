export class RendererAuthService {
  async logIn(credentials: { clientId: string; clientSecret: string }): Promise<void> {
    return ipc.auth.logIn(credentials);
  }

  logOut(): Promise<void> {
    return ipc.auth.logOut();
  }
}
