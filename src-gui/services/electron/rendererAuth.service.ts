export class RendererAuthService {
  checkTokens(): Promise<{ accessToken: string | null; organizationId: string | null }> {
    return ipc.auth.checkTokens();
  }

  logIn(credentials: { clientId: string; clientSecret: string }): Promise<void> {
    return ipc.auth.logIn(credentials);
  }

  logOut(): Promise<void> {
    return ipc.auth.logOut();
  }
}
