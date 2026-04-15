// Shim: proper-lockfile expects require('signal-exit') to return the onExit function
// directly (signal-exit v3 behavior). signal-exit v4 uses named exports only.
// This shim re-exports the function as the module default.
"use strict";
const signalExit = require("../node_modules/signal-exit/dist/cjs/index.js");
module.exports = signalExit.onExit;
