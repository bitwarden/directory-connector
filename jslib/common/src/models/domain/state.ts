import { Account } from "./account";
import { GlobalState } from "./globalState";

export class State<
  TGlobalState extends GlobalState = GlobalState,
  TAccount extends Account = Account
> {
  accounts: { [userId: string]: TAccount } = {};
  globals: TGlobalState;
  activeUserId: string;
  authenticatedAccounts: string[] = [];
  accountActivity: { [userId: string]: number } = {};

  constructor(globals: TGlobalState) {
    this.globals = globals;
  }
}
