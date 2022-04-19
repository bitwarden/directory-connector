# How to Contribute

Contributions of all kinds are welcome!

Please visit our [Community Forums](https://community.bitwarden.com/) for general community discussion and the development roadmap.

Here is how you can get involved:

- **Request a new feature:** Go to the [Feature Requests category](https://community.bitwarden.com/c/feature-requests/) of the Community Forums. Please search existing feature requests before making a new one
- **Write code for a new feature:** Make a new post in the [Github Contributions category](https://community.bitwarden.com/c/github-contributions/) of the Community Forums. Include a description of your proposed contribution, screeshots, and links to any relevant feature requests. This helps get feedback from the community and Bitwarden team members before you start writing code
- **Report a bug or submit a bugfix:** Use Github issues and pull requests
- **Write documentation:** Submit a pull request to the [Bitwarden help repository](https://github.com/bitwarden/help)
- **Help other users:** Go to the [User-to-User Support category](https://community.bitwarden.com/c/support/) on the Community Forums

## Contributor Agreement

Please sign the [Contributor Agreement](https://cla-assistant.io/bitwarden/jslib) if you intend on contributing to any Github repository. Pull requests cannot be accepted and merged unless the author has signed the Contributor Agreement.

## Pull Request Guidelines

- use `npm run lint` and fix any linting suggestions before submitting a pull request
- commit any pull requests against the `master` branch
- include a link to your Community Forums post

# Introduction to jslib and git submodules

jslib is a repository that contains shared code for all Bitwarden Typescript/Javascript clients (web, desktop, browser, CLI, and directory connector). The clients use this code by consuming jslib as a submodule. This makes jslib code available to each client under the `jslib` directory of the client repository.

If you haven't worked with submodules before, you should start by reading some basic guides (such as the [git scm chapter](https://git-scm.com/book/en/v2/Git-Tools-Submodules) or the [Atlassian tutorial](https://www.atlassian.com/git/tutorials/git-submodule)).

# Setting up your Local Dev environment for jslib

In order to easily develop local changes to jslib across each of the TypeScript/JavaScript clients, we recommend using symlinks for the submodule so that you only have to make the change once for it to be reflected across all your local repos.

## Prerequisites

1. git bash or other git command line
2. In order for this to work well, you need to use a consistent relative directory structure. Repos should be cloned in the following way:

   - `./<your project(s) directory>`; we'll call this `/dev` ('cause why not)
     - jslib - `git clone https://github.com/bitwarden/jslib.git` (/dev/jslib)
     - web - `git clone --recurse-submodules https://github.com/bitwarden/web.git` (/dev/web)
     - desktop - `git clone --recurse-submodules https://github.com/bitwarden/desktop.git` (/dev/desktop)
     - browser - `git clone --recurse-submodules https://github.com/bitwarden/browser.git` (/dev/browser)
     - cli - `git clone --recurse-submodules https://github.com/bitwarden/cli` (/dev/cli)

   You should notice web, desktop, browser and cli each reference jslib as a git submodule. If you've already cloned the repos but didn't use `--recurse-submodules` then you'll need to init the submodule with `npm run sub:init`.

## Configure Symlinks

Using `git clone` will make symlinks added to your repo be seen by git as plain text file paths. We need to prevent that. In the project root run, `git config core.symlinks true`.

For each project other than jslib, run the following:

- For macOS/Linux: `npm run symlink:mac`
- For Windows: `npm run symlink:win`

Your client repos will now be pointing to your local jslib repo. You can now make changes in jslib and they will be immediately shared by the clients (just like they will be in production).

## Committing and pushing jslib changes

- You work on jslib like any other repo. Check out a new branch, make some commits, and push to remote when you're ready to submit a PR.
- Do not commit your jslib changes in the client repo. Your changes to the client and your changes to jslib should stay completely separate.
- When submitting a client PR that depends on a jslib PR, please include a link to the jslib PR so that the reviewer knows there are jslib changes.

### Updating jslib on a feature branch

If you've submitted a client PR and a jslib PR, your jslib PR will be approved and merged first. You then need to update jslib on your client PR.

1. If you've symlinked the client's jslib directory following the steps above, you'll need to delete that symlink and then run `npm run sub:init`.
2. Update the jslib submodule:
   - if you're working on your own fork, run `git submodule update --remote --reference upstream`.
   - if you're working on a branch on the official repo, run `npm run sub:update`
3. To check you've done this correctly, you can `cd` into your jslib directory and run `git log`. You should see your recent changes in the log. This will also show you the most recent commit hash, which should match the most recent commit hash on [Github](https://github.com/bitwarden/jslib).
4. Add your changes: `git add jslib`
5. Commit your changes: `git commit -m "update jslib version"`
6. Push your changes: `git push`

Once this is complete, your client PR will be ready for final review and merging.

### Updating jslib on a client directly

If you've made changes to jslib without needing to make any changes to the client, then you may be asked to update jslib on the client. This is similar to the above process, except that you'll be creating a new client branch and PR solely for the jslib update.

1. Make sure your local client repo is up to date
2. Create a new branch: `git checkout -b update-jslib`
3. Follow the steps above
4. Create a new PR to the client repo. Please include a link to your jslib PR so that reviewers know why you're updating jslib.

## Merge Conflicts

At times when you need to perform a `git merge master` into your feature or local branch, and there are conflicting version references to the _jslib_ repo from your other clients, you will not be able to use the traditional merge or stage functions you would normally use for a file.

To resolve you must use either `git reset` or update the index directly using `git update-index`. You can use (depending on whether you have symlink'd jslib) one of the following:

```bash
git reset master -- jslib
git reset master@{upstream} -- jslib
git reset HEAD -- jslib
git reset MERGE_HEAD -- jslib
```

Those should automatically stage the change and reset the jslib submodule back to where it needs to be (generally at the latest version from `master`).

The other option is to update the index directly using the plumbing command git update-index. To do that, you need to know that an object of type gitlink (i.e., directory entry in a parent repository that points to a submodule) is 0160000. You can figure it out from `git ls-files -s` or the following reference (see "1110 (gitlink)" under 4-bit object type): https://github.com/gitster/git/blob/master/Documentation/technical/index-format.txt

To use that approach, figure out the hash you want to set the submodule to, then run, e.g.:

`git update-index --cacheinfo 0160000,533da4ea00703f4ad6d5518e1ce81d20261c40c0,jslib`

see: [https://stackoverflow.com/questions/26617838/how-to-resolve-git-submodule-conflict-if-submodule-is-not-initialized](https://stackoverflow.com/questions/26617838/how-to-resolve-git-submodule-conflict-if-submodule-is-not-initialized)
