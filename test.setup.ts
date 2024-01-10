import { webcrypto } from "crypto";

import "jest-preset-angular/setup-jest";
import { toEqualBuffer } from "jslib/common/spec";

Object.defineProperty(window, "CSS", { value: null });
Object.defineProperty(window, "getComputedStyle", {
  value: () => {
    return {
      display: "none",
      appearance: ["-webkit-appearance"],
    };
  },
});

Object.defineProperty(document, "doctype", {
  value: "<!DOCTYPE html>",
});
Object.defineProperty(document.body.style, "transform", {
  value: () => {
    return {
      enumerable: true,
      configurable: true,
    };
  },
});

Object.defineProperty(window, "crypto", {
  value: webcrypto,
});

Object.defineProperty(window, "crypto", {
  value: webcrypto,
});

expect.extend({
  toEqualBuffer: toEqualBuffer,
});

export interface CustomMatchers<R = unknown> {
  toEqualBuffer(expected: Uint8Array | ArrayBuffer): R;
}
