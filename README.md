![Build](https://github.com/bitwarden/directory-connector/workflows/Build/badge.svg)
[![Join the chat at https://gitter.im/bitwarden/Lobby](https://badges.gitter.im/bitwarden/Lobby.svg)](https://gitter.im/bitwarden/Lobby)

# Bitwarden Directory Connector

The Bitwarden Directory Connector is a desktop application used to sync your Bitwarden enterprise organization to an existing directory of users and groups.

Supported directories:

- Active Directory
- Any other LDAP-based directory
- Microsoft Entra ID
- G Suite (Google)
- Okta

The application is written using Electron with Angular and installs on Windows, macOS, and Linux distributions.

[![Platforms](https://imgur.com/SLv9paA.png "Windows, macOS, and Linux")](https://bitwarden.com/help/directory-sync/#download-and-install)

![Directory Connector](https://raw.githubusercontent.com/bitwarden/brand/master/screenshots/directory-connector-macos.png "Dashboard")

## Command-line Interface

A command-line interface tool is also available for the Bitwarden Directory Connector. The Directory Connector CLI (`bwdc`) is written with TypeScript and Node.js and can also be run on Windows, macOS, and Linux distributions.

## CLI Documentation

The Bitwarden Directory Connector CLI is self-documented with `--help` content and examples for every command. You should start exploring the CLI by using the global `--help` option:

```bash
bwdc --help
```

This option will list all available commands that you can use with the Directory Connector CLI.

Additionally, you can run the `--help` option on a specific command to learn more about it:

```
bwdc test --help
bwdc config --help
```

**Detailed Documentation**

We provide detailed documentation and examples for using the Directory Connector CLI in our help center at https://bitwarden.com/help/directory-sync-cli/.

## Build/Run

**Requirements**

- [Node.js](https://nodejs.org) v18 (LTS)
- Windows users: To compile the native node modules used in the app you will need the Visual C++ toolset, available through the standard Visual Studio installer (recommended) or by installing [`windows-build-tools`](https://github.com/felixrieseberg/windows-build-tools) through `npm`. See more at [Compiling native Addon modules](https://github.com/Microsoft/nodejs-guidelines/blob/master/windows-environment.md#compiling-native-addon-modules).

**Run the app**

```bash
npm install
npm run reset # Only necessary if you have previously run the CLI app
npm run rebuild
npm run electron
```

**Run the CLI**

```bash
npm install
npm run reset # Only necessary if you have previously run the desktop app
npm run build:cli:watch
```

You can then run commands from the `./build-cli` folder:

```bash
node ./build-cli/bwdc.js --help
```

## We're Hiring!

Interested in contributing in a big way? Consider joining our team! We're hiring for many positions. Please take a look at our [Careers page](https://bitwarden.com/careers/) to see what opportunities are currently open as well as what it's like to work at Bitwarden.

## Contribute

Code contributions are welcome! Please commit any pull requests against the `master` branch. Learn more about how to contribute by reading the [`CONTRIBUTING.md`](CONTRIBUTING.md) file.

Security audits and feedback are welcome. Please open an issue or email us privately if the report is sensitive in nature. You can read our security policy in the [`SECURITY.md`](SECURITY.md) file.

### Prettier

We recently migrated to using Prettier as code formatter. All previous branches will need to updated to avoid large merge conflicts using the following steps:

1. Check out your local Branch
2. Run `git merge 225073aa335d33ad905877b68336a9288e89ea10`
3. Resolve any merge conflicts, commit.
4. Run `npm run prettier`
5. Commit
6. Run `git merge -Xours 096196fcd512944d1c3d9c007647a1319b032639`
7. Push

#### Git blame

We also recommend that you configure git to ignore the prettier revision using:

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```
