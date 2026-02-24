// Secure storage is handled directly in the renderer process via dc-native,
// so this listener is no longer needed. Kept as a stub to avoid refactoring
// the main.ts bootstrap sequence.
export class DCCredentialStorageListener {
   
  constructor(private serviceName: string) {}

  init() {
    // no-op: renderer calls dc-native directly
  }
}
