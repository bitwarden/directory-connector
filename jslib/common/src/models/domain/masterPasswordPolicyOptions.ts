export interface MasterPasswordPolicyOptions {
  minComplexity?: number;
  minLength?: number;
  requireUpper?: boolean;
  requireLower?: boolean;
  requireNumbers?: boolean;
  requireSpecial?: boolean;
}
