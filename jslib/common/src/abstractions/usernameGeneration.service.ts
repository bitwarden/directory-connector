export abstract class UsernameGenerationService {
  generateUsername: (options: any) => Promise<string>;
  generateWord: (options: any) => Promise<string>;
  generateSubaddress: (options: any) => Promise<string>;
  generateCatchall: (options: any) => Promise<string>;
  getOptions: () => Promise<any>;
  saveOptions: (options: any) => Promise<void>;
}
