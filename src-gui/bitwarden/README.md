# Vendored Bitwarden component library

`components/` is a subset of [`libs/components`](https://github.com/bitwarden/clients/tree/main/libs/components)
from `bitwarden/clients` (synced at `fd33a80d36`). `@bitwarden/components` isn't published to npm, so the
directories Directory Connector uses are copied here and imported through the `@bitwarden/components`
path alias. Specs, stories and docs are omitted. The directory is excluded from ESLint and Prettier so it
stays diffable against upstream.

`shims/` maps the few `@bitwarden/common`, `@bitwarden/logging` and `@bitwarden/ui-common` imports the
components make onto Directory Connector's own services (see the `paths` in `tsconfig.json`).

## Local changes to upstream files

- `index.ts`: only exports the vendored directories.
- `form-field/form-field.module.ts`: drops `MultiSelectModule`, which would pull in `@ng-select/ng-select`.
- `utils/index.ts`: drops the Storybook-only `state-mock` export (file removed).
- `toast/toastr.component.ts`: updated for ngx-toastr 20 (`inject()`-based base class, `options` is a signal).
- `tailwind.config.base.cjs`: renamed from `.js` because this package is `"type": "module"`.

`popover/`, `search/` and `navigation/` only contain the CSS that `tw-theme.css` imports.

## Syncing

Copy the same directories from `clients/libs/components/src` (excluding `*.spec.ts`, `*.stories.ts`, `*.mdx`),
re-apply the changes above, then run `npx tsc --noEmit` and `npm run build:renderer`.
