[![Github Workflow build on master](https://github.com/bitwarden/jslib/actions/workflows/build.yml/badge.svg?branch=master)](https://github.com/bitwarden/jslib/actions/workflows/build.yml?query=branch:master)

# Bitwarden JavaScript Library

Common code referenced across Bitwarden JavaScript projects.

## Requirements

- [Node.js](https://nodejs.org) v16.13.1 or greater
- NPM v8
- Git
- node-gyp

### Windows

- _Microsoft Build Tools 2015_ in Visual Studio Installer
- [Windows 10 SDK 17134](https://developer.microsoft.com/en-us/windows/downloads/sdk-archive/)
  either by downloading it seperately or through the Visual Studio Installer.

## We're Hiring!

Interested in contributing in a big way? Consider joining our team! We're hiring for many positions. Please take a look at our [Careers page](https://bitwarden.com/careers/) to see what opportunities are currently open as well as what it's like to work at Bitwarden.

## Prettier

We recently migrated to using Prettier as code formatter. All previous branches will need to updated to avoid large merge conflicts using the following steps:

1. Check out your local Branch
2. Run `git merge 8b2dfc6cdcb8ff5b604364c2ea6d343473aee7cd`
3. Resolve any merge conflicts, commit.
4. Run `npm run prettier`
5. Commit
6. Run `git merge -Xours 193434461dbd9c48fe5dcbad95693470aec422ac`
7. Push

### Git blame

We also recommend that you configure git to ignore the prettier revision using:

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```
