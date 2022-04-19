import { ApiService } from "../abstractions/api.service";
import { AuditService as AuditServiceAbstraction } from "../abstractions/audit.service";
import { CryptoFunctionService } from "../abstractions/cryptoFunction.service";
import { throttle } from "../misc/throttle";
import { Utils } from "../misc/utils";
import { BreachAccountResponse } from "../models/response/breachAccountResponse";
import { ErrorResponse } from "../models/response/errorResponse";

const PwnedPasswordsApi = "https://api.pwnedpasswords.com/range/";

export class AuditService implements AuditServiceAbstraction {
  constructor(
    private cryptoFunctionService: CryptoFunctionService,
    private apiService: ApiService
  ) {}

  @throttle(100, () => "passwordLeaked")
  async passwordLeaked(password: string): Promise<number> {
    const hashBytes = await this.cryptoFunctionService.hash(password, "sha1");
    const hash = Utils.fromBufferToHex(hashBytes).toUpperCase();
    const hashStart = hash.substr(0, 5);
    const hashEnding = hash.substr(5);

    const response = await this.apiService.nativeFetch(new Request(PwnedPasswordsApi + hashStart));
    const leakedHashes = await response.text();
    const match = leakedHashes.split(/\r?\n/).find((v) => {
      return v.split(":")[0] === hashEnding;
    });

    return match != null ? parseInt(match.split(":")[1], 10) : 0;
  }

  async breachedAccounts(username: string): Promise<BreachAccountResponse[]> {
    try {
      return await this.apiService.getHibpBreach(username);
    } catch (e) {
      const error = e as ErrorResponse;
      if (error.statusCode === 404) {
        return [];
      }
      throw new Error();
    }
  }
}
