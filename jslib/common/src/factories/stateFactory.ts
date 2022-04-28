import { Account } from "../models/domain/account";
import { GlobalState } from "../models/domain/globalState";

import { AccountFactory } from "./accountFactory";
import { GlobalStateFactory } from "./globalStateFactory";

export class StateFactory<
  TGlobal extends GlobalState = GlobalState,
  TAccount extends Account = Account
> {
  private globalStateFactory: GlobalStateFactory<TGlobal>;
  private accountFactory: AccountFactory<TAccount>;

  constructor(
    globalStateConstructor: new (init: Partial<TGlobal>) => TGlobal,
    accountConstructor: new (init: Partial<TAccount>) => TAccount
  ) {
    this.globalStateFactory = new GlobalStateFactory(globalStateConstructor);
    this.accountFactory = new AccountFactory(accountConstructor);
  }

  createGlobal(args: Partial<TGlobal>): TGlobal {
    return this.globalStateFactory.create(args);
  }

  createAccount(args: Partial<TAccount>): TAccount {
    return this.accountFactory.create(args);
  }
}
