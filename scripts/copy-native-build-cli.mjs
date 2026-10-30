#!/usr/bin/env node
/**
 * Copy native (.node) binaries from node_modules/dc-native to build-cli/.
 */

import { readdirSync, copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const src = "node_modules/dc-native";
const dst = "build-cli";

mkdirSync(dst, { recursive: true });

readdirSync(src)
  .filter((f) => f.endsWith(".node"))
  .forEach((f) => copyFileSync(join(src, f), join(dst, f)));
