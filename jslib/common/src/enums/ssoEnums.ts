export enum SsoType {
  None = 0,
  OpenIdConnect = 1,
  Saml2 = 2,
}

export enum OpenIdConnectRedirectBehavior {
  RedirectGet = 0,
  FormPost = 1,
}

export enum Saml2BindingType {
  HttpRedirect = 1,
  HttpPost = 2,
}

export enum Saml2NameIdFormat {
  NotConfigured = 0,
  Unspecified = 1,
  EmailAddress = 2,
  X509SubjectName = 3,
  WindowsDomainQualifiedName = 4,
  KerberosPrincipalName = 5,
  EntityIdentifier = 6,
  Persistent = 7,
  Transient = 8,
}

export enum Saml2SigningBehavior {
  IfIdpWantAuthnRequestsSigned = 0,
  Always = 1,
  Never = 3,
}
