$homePath = Resolve-Path "~" | Select-Object -ExpandProperty Path;
$secretsPath = $homePath + "/secrets"

$devidAppCertPath = $($secretsPath + "/devid-app-cert.p12");
$devidInstallerCertPath = $($secretsPath + "/devid-installer-cert.p12");
$macdevCertPath = $($secretsPath + "/macdev-cert.p12");

security create-keychain -p $env:KEYCHAIN_PASSWORD build.keychain
security default-keychain -s build.keychain
security unlock-keychain -p $env:KEYCHAIN_PASSWORD build.keychain
security set-keychain-settings -lut 1200 build.keychain
security import $devidAppCertPath -k build.keychain -P $env:DEVID_CERT_PASSWORD -T /usr/bin/codesign -T /usr/bin/security -T /usr/bin/productbuild
security import $devidInstallerCertPath -k build.keychain -P $env:DEVID_CERT_PASSWORD -T /usr/bin/codesign -T /usr/bin/security -T /usr/bin/productbuild
security import $macdevCertPath -k build.keychain -P $env:MACDEV_CERT_PASSWORD -T /usr/bin/codesign -T /usr/bin/security -T /usr/bin/productbuild
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k $env:KEYCHAIN_PASSWORD build.keychain
