$rootPath = $env:GITHUB_WORKSPACE;

$decryptSecretPath = $($rootPath + "/.github/scripts/decrypt-secret.ps1");

#Invoke-Expression "& `"$decryptSecretPath`" -filename bitwarden-connector-key.p12.gpg"
Invoke-Expression "& `"$decryptSecretPath`" -filename devid-app-cert.p12.gpg"
Invoke-Expression "& `"$decryptSecretPath`" -filename devid-installer-cert.p12.gpg"
Invoke-Expression "& `"$decryptSecretPath`" -filename macdev-cert.p12.gpg"
