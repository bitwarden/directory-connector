// Shim: proper-lockfile expects require('signal-exit') to return the onExit function
// directly (signal-exit v3 behavior). signal-exit v4 uses named exports only.
// This shim satisfies both consumers:
//   - proper-lockfile (CJS): require('signal-exit') returns a callable onExit function
//   - @inquirer/core (ESM): import { onExit } from 'signal-exit' gets the onExit function
//     (webpack resolves named ESM imports from properties of module.exports)
"use strict";
const signalExit = require("../node_modules/signal-exit/dist/cjs/index.js");
const onExit = signalExit.onExit;
// Make the export callable (for proper-lockfile's `const onExit = require('signal-exit')`)
// while also exposing named exports (for @inquirer/core's `import { onExit } from 'signal-exit'`)
module.exports = onExit;
module.exports.onExit = onExit;
module.exports.default = onExit;
