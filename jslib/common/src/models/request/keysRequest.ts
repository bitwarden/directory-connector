export class KeysRequest {
  publicKey: string;
  encryptedPrivateKey: string;

  constructor(publicKey: string, encryptedPrivateKey: string) {
    this.publicKey = publicKey;
    this.encryptedPrivateKey = encryptedPrivateKey;
  }
}
