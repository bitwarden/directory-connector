[![appveyor build](https://ci.appveyor.com/api/projects/status/github/bitwarden/directory-connector?branch=master&svg=true)](https://ci.appveyor.com/project/bitwarden/directory-connector)
[![Join the chat at https://gitter.im/bitwarden/Lobby](https://badges.gitter.im/bitwarden/Lobby.svg)](https://gitter.im/bitwarden/Lobby)

# Bitwarden Directory Connector

<a href="https://bitwarden.com/#download"><img src="https://imgur.com/SLv9paA.png" width="500" height="113"></a>

The Bitwarden Directory Connector is an application used to connect your Bitwarden enterprise organization to an existing directory of users and groups.

Supported directories:
- Active Directory
- Any other LDAP-based directory
- Azure Active Directory
- G Suite (Google)
- Okta

The Bitwarden Directory Connector application is written using Electron and Angular. The application installs on Windows, macOS, and Linux distributions.

# Build/Run

**Requirements**

- [Node.js](https://nodejs.org/)
- Windows users: To compile the native node modules used in the app you will need the Visual C++ toolset, available through the standard Visual Studio installer (recommended) or by installing [`windows-build-tools`](https://github.com/felixrieseberg/windows-build-tools) through `npm`. See more at [Compiling native Addon modules](https://github.com/Microsoft/nodejs-guidelines/blob/master/windows-environment.md#compiling-native-addon-modules).

**Run the app**

```bash
npm install
npm run electron
```

# Contribute

Code contributions are welcome! Please commit any pull requests against the `master` branch. Learn more about how to contribute by reading the [`CONTRIBUTING.md`](CONTRIBUTING.md) file.

Security audits and feedback are welcome. Please open an issue or email us privately if the report is sensitive in nature. You can read our security policy in the [`SECURITY.md`](SECURITY.md) file.
