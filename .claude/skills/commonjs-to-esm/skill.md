---
userInvocable: true
---

# CommonJS to ESM Conversion

Convert a file (or files) from CommonJS module syntax to ECMAScript Modules (ESM).

## Usage

```
/commonjs-to-esm <file-path> [additional-file-paths...]
```

## Parameters

- `file-path` - Path to the file(s) to convert from CommonJS to ESM

## Examples

```
/commonjs-to-esm src/services/auth.service.ts
/commonjs-to-esm src/utils/helper.ts src/utils/parser.ts
```

## Process

This skill performs a comprehensive analysis and planning process:

### 1. Analyze Target File(s)

For each file to convert:

- Read the file contents
- Identify its purpose and functionality
- Catalog all CommonJS patterns used:
  - `require()` statements
  - `module.exports` assignments
  - `exports.x = ...` assignments
  - Dynamic requires
  - `__dirname` and `__filename` usage

### 2. Find Dependents

- Search for all files that import/require the target file(s)
- Identify the import patterns used by dependents
- Map the dependency tree to understand impact scope

### 3. Analyze Dependencies

- List all modules the target file(s) depend on
- Determine if dependencies support ESM
- Identify potential blocking dependencies (CommonJS-only packages)
- Check for dynamic imports that may need special handling

### 4. Identify Conversion Challenges

Common issues to flag:

- `__dirname` and `__filename` (need `import.meta.url` conversion)
- Dynamic `require()` calls (need `import()` conversion)
- Conditional requires (need refactoring)
- JSON imports (need `assert { type: 'json' }`)
- CommonJS-only dependencies (may block conversion)
- Circular dependencies (may need restructuring)

### 5. Generate Conversion Plan

Create a step-by-step plan that includes:

**Target File Changes:**

- Convert `require()` to `import` statements
- Convert `module.exports` to `export` statements
- Update `__dirname`/`__filename` to use `import.meta.url`
- Handle dynamic imports appropriately
- Update file extensions if needed (e.g., `.js` to `.mjs`)

**Dependent File Changes:**

- Update all import statements in dependent files
- Ensure consistent naming (default vs named exports)
- Update path references if extensions change

**Configuration Changes:**

- `package.json`: Add `"type": "module"` or use `.mjs` extension
- `tsconfig.json`: Update `module` and `moduleResolution` settings
- Build tools: Update bundler/compiler configurations

**Testing Strategy:**

- Run unit tests after conversion
- Verify no runtime errors from import changes
- Check that all exports are accessible
- Test dynamic import scenarios

### 6. Risk Assessment

Evaluate:

- Number of files affected
- Complexity of CommonJS patterns used
- Presence of blocking dependencies
- Potential for breaking changes

### 7. Present Plan

Output a structured plan with:

- Summary of changes needed
- Ordered steps for execution
- List of files to modify
- Configuration changes required
- Testing checkpoints
- Risk factors and mitigation strategies
- Estimated scope (small/medium/large change)

## Notes

- ESM is **not** compatible with CommonJS in all cases - ESM can import CommonJS, but CommonJS **cannot** require ESM
- This means conversions should generally proceed from leaf dependencies upward
- Some packages remain CommonJS-only and may block full conversion
- The skill generates a plan but does NOT automatically execute the conversion - review and approve first

## References

- [Pure ESM package guide](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)
- [Node.js ESM documentation](https://nodejs.org/api/esm.html)
- [TypeScript ESM support](https://www.typescriptlang.org/docs/handbook/esm-node.html)
