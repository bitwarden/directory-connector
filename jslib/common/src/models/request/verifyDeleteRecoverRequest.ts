export class VerifyDeleteRecoverRequest {
  userId: string;
  token: string;

  constructor(userId: string, token: string) {
    this.userId = userId;
    this.token = token;
  }
}
