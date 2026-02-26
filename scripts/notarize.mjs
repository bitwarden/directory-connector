import "dotenv/config";
import notarizeModule from "@electron/notarize";

const { notarize } = notarizeModule;

export default async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  if (process.env.APP_STORE_CONNECT_TEAM_ISSUER) {
    const appleApiIssuer = process.env.APP_STORE_CONNECT_TEAM_ISSUER;
    const appleApiKey = process.env.APP_STORE_CONNECT_AUTH_KEY_PATH;
    const appleApiKeyId = process.env.APP_STORE_CONNECT_AUTH_KEY;
    return await notarize({
      tool: "notarytool",
      appBundleId: "com.bitwarden.directory-connector",
      appPath: `${appOutDir}/${appName}.app`,
      appleApiIssuer: appleApiIssuer,
      appleApiKey: appleApiKey,
      appleApiKeyId: appleApiKeyId,
    });
  } else {
    const appleId = process.env.APPLE_ID_USERNAME || process.env.APPLEID;
    const appleIdPassword = process.env.APPLE_ID_PASSWORD || `@keychain:AC_PASSWORD`;
    return await notarize({
      tool: "notarytool",
      appBundleId: "com.bitwarden.directory-connector",
      appPath: `${appOutDir}/${appName}.app`,
      teamId: "LTZ2PFU5D6",
      appleId: appleId,
      appleIdPassword: appleIdPassword,
    });
  }
}
