[![appveyor build](https://ci.appveyor.com/api/projects/status/github/bitwarden/directory-connector?branch=master&svg=true)](https://ci.appveyor.com/project/bitwarden/directory-connector)
[![Join the chat at https://gitter.im/bitwarden/Lobby](https://badges.gitter.im/bitwarden/Lobby.svg)](https://gitter.im/bitwarden/Lobby)

# bitwarden Directory Connector

The bitwarden Directory Connector is a command line application used to connect your bitwarden enterprise organization to an existing directory of users and groups.
It is written in C# with the .NET Framework. It consists of a console application and an optional windows service to run syncs in the background on a specified interval.

Supported directories:
- Active Directory
- Azure Active Directory
- GSuite (Google)
- Any other LDAP-based directory

<img src="https://i.imgur.com/IdqS0se.png" alt="" width="680" height="479" />

# Build/Run

**Requirements**

- [Visual Studio](https://www.visualstudio.com/)

Open `bitwarden-directory-connector.sln` or `bitwarden-directory-connector-noinstaller.sln`. After restoring the nuget packages, you can build and run the application.

# Contribute

Code contributions are welcome! Visual Studio is required to work on this project. Please commit any pull requests against the `master` branch.

Security audits and feedback are welcome. Please open an issue or email us privately if the report is sensitive in nature. You can read our security policy in the [`SECURITY.md`](SECURITY.md) file.
