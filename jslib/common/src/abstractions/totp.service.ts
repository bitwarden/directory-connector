export abstract class TotpService {
  getCode: (key: string) => Promise<string>;
  getTimeInterval: (key: string) => number;
  isAutoCopyEnabled: () => Promise<boolean>;
}
