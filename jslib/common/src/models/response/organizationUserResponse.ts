import { KdfType } from "../../enums/kdfType";
import { OrganizationUserStatusType } from "../../enums/organizationUserStatusType";
import { OrganizationUserType } from "../../enums/organizationUserType";
import { PermissionsApi } from "../api/permissionsApi";

import { BaseResponse } from "./baseResponse";
import { SelectionReadOnlyResponse } from "./selectionReadOnlyResponse";

export class OrganizationUserResponse extends BaseResponse {
  id: string;
  userId: string;
  type: OrganizationUserType;
  status: OrganizationUserStatusType;
  accessAll: boolean;
  permissions: PermissionsApi;
  resetPasswordEnrolled: boolean;

  constructor(response: any) {
    super(response);
    this.id = this.getResponseProperty("Id");
    this.userId = this.getResponseProperty("UserId");
    this.type = this.getResponseProperty("Type");
    this.status = this.getResponseProperty("Status");
    this.permissions = new PermissionsApi(this.getResponseProperty("Permissions"));
    this.accessAll = this.getResponseProperty("AccessAll");
    this.resetPasswordEnrolled = this.getResponseProperty("ResetPasswordEnrolled");
  }
}

export class OrganizationUserUserDetailsResponse extends OrganizationUserResponse {
  name: string;
  email: string;
  twoFactorEnabled: boolean;
  usesKeyConnector: boolean;

  constructor(response: any) {
    super(response);
    this.name = this.getResponseProperty("Name");
    this.email = this.getResponseProperty("Email");
    this.twoFactorEnabled = this.getResponseProperty("TwoFactorEnabled");
    this.usesKeyConnector = this.getResponseProperty("UsesKeyConnector") ?? false;
  }
}

export class OrganizationUserDetailsResponse extends OrganizationUserResponse {
  collections: SelectionReadOnlyResponse[] = [];

  constructor(response: any) {
    super(response);
    const collections = this.getResponseProperty("Collections");
    if (collections != null) {
      this.collections = collections.map((c: any) => new SelectionReadOnlyResponse(c));
    }
  }
}

export class OrganizationUserResetPasswordDetailsReponse extends BaseResponse {
  kdf: KdfType;
  kdfIterations: number;
  resetPasswordKey: string;
  encryptedPrivateKey: string;

  constructor(response: any) {
    super(response);
    this.kdf = this.getResponseProperty("Kdf");
    this.kdfIterations = this.getResponseProperty("KdfIterations");
    this.resetPasswordKey = this.getResponseProperty("ResetPasswordKey");
    this.encryptedPrivateKey = this.getResponseProperty("EncryptedPrivateKey");
  }
}
