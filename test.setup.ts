import { webcrypto } from "crypto";
import { TextEncoder, TextDecoder } from "util";

Object.assign(globalThis, { TextEncoder, TextDecoder });

// The following setup is only needed in jsdom environments (Angular/browser tests).
// Integration tests that use @jest-environment node skip this block.
if (typeof window !== "undefined") {
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
}
