import {
  OpenIdConnectRedirectBehavior,
  Saml2BindingType,
  Saml2NameIdFormat,
  Saml2SigningBehavior,
  SsoType,
} from "../../enums/ssoEnums";
import { SsoConfigApi } from "../api/ssoConfigApi";

import { View } from "./view";

export class SsoConfigView extends View {
  configType: SsoType;

  keyConnectorEnabled: boolean;
  keyConnectorUrl: string;

  openId: {
    authority: string;
    clientId: string;
    clientSecret: string;
    metadataAddress: string;
    redirectBehavior: OpenIdConnectRedirectBehavior;
    getClaimsFromUserInfoEndpoint: boolean;
    additionalScopes: string;
    additionalUserIdClaimTypes: string;
    additionalEmailClaimTypes: string;
    additionalNameClaimTypes: string;
    acrValues: string;
    expectedReturnAcrValue: string;
  };

  saml: {
    spNameIdFormat: Saml2NameIdFormat;
    spOutboundSigningAlgorithm: string;
    spSigningBehavior: Saml2SigningBehavior;
    spMinIncomingSigningAlgorithm: boolean;
    spWantAssertionsSigned: boolean;
    spValidateCertificates: boolean;

    idpEntityId: string;
    idpBindingType: Saml2BindingType;
    idpSingleSignOnServiceUrl: string;
    idpSingleLogoutServiceUrl: string;
    idpX509PublicCert: string;
    idpOutboundSigningAlgorithm: string;
    idpAllowUnsolicitedAuthnResponse: boolean;
    idpAllowOutboundLogoutRequests: boolean;
    idpWantAuthnRequestsSigned: boolean;
  };

  constructor(api: SsoConfigApi) {
    super();
    if (api == null) {
      return;
    }

    this.configType = api.configType;

    this.keyConnectorEnabled = api.keyConnectorEnabled;
    this.keyConnectorUrl = api.keyConnectorUrl;

    if (this.configType === SsoType.OpenIdConnect) {
      this.openId = {
        authority: api.authority,
        clientId: api.clientId,
        clientSecret: api.clientSecret,
        metadataAddress: api.metadataAddress,
        redirectBehavior: api.redirectBehavior,
        getClaimsFromUserInfoEndpoint: api.getClaimsFromUserInfoEndpoint,
        additionalScopes: api.additionalScopes,
        additionalUserIdClaimTypes: api.additionalUserIdClaimTypes,
        additionalEmailClaimTypes: api.additionalEmailClaimTypes,
        additionalNameClaimTypes: api.additionalNameClaimTypes,
        acrValues: api.acrValues,
        expectedReturnAcrValue: api.expectedReturnAcrValue,
      };
    } else if (this.configType === SsoType.Saml2) {
      this.saml = {
        spNameIdFormat: api.spNameIdFormat,
        spOutboundSigningAlgorithm: api.spOutboundSigningAlgorithm,
        spSigningBehavior: api.spSigningBehavior,
        spMinIncomingSigningAlgorithm: api.spMinIncomingSigningAlgorithm,
        spWantAssertionsSigned: api.spWantAssertionsSigned,
        spValidateCertificates: api.spValidateCertificates,

        idpEntityId: api.idpEntityId,
        idpBindingType: api.idpBindingType,
        idpSingleSignOnServiceUrl: api.idpSingleSignOnServiceUrl,
        idpSingleLogoutServiceUrl: api.idpSingleLogoutServiceUrl,
        idpX509PublicCert: api.idpX509PublicCert,
        idpOutboundSigningAlgorithm: api.idpOutboundSigningAlgorithm,
        idpAllowUnsolicitedAuthnResponse: api.idpAllowUnsolicitedAuthnResponse,
        idpWantAuthnRequestsSigned: api.idpWantAuthnRequestsSigned,

        // Value is inverted in the view model (allow instead of disable)
        idpAllowOutboundLogoutRequests:
          api.idpDisableOutboundLogoutRequests == null
            ? null
            : !api.idpDisableOutboundLogoutRequests,
      };
    }
  }
}
