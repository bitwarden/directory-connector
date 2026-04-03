import { TwoFactorProviderType } from "@/libs/enums/twoFactorProviderType";

export class TokenRequestTwoFactor {
  constructor(
    public provider: TwoFactorProviderType = null,
    public token: string = null,
    public remember: boolean = false,
  ) {}
}
