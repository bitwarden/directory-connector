/* eslint-disable @typescript-eslint/no-var-requires */
require("dotenv").config();
const { notarize } = require("electron-notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }
  const appleId = process.env.APPLE_ID_USERNAME || process.env.APPLEID;
  const appleIdPassword = process.env.APPLE_ID_PASSWORD || `@keychain:AC_PASSWORD`;
  const appName = context.packager.appInfo.productFilename;
  return await notarize({
    appBundleId: "com.bitwarden.directory-connector",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: appleId,
    appleIdPassword: appleIdPassword,
  });
};
