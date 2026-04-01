// ── __appDirname ─────────────────────────────────────────────────────────────
// The preload is loaded by Electron as a real filesystem file (build/preload.js),
// so Node.js sets __dirname to the build/ directory. Expose it as a global so
// renderer code can use it to locate app resources (e.g. locale files) regardless
// of which protocol the page was loaded from. Without this, scripts loaded via the
// app:// custom protocol receive a __dirname that resolves inside electron.asar.
globalThis.__appDirname = __dirname;

// ── SharedArrayBuffer ─────────────────────────────────────────────────────────
// Workaround for Electron 41 regression (electron/electron#50242):
// HasPotentialUniversalAccessPrivilege() in Chromium's document_loader.cc is
// treated unconditionally for all origins, preventing cross-origin isolation (COI)
// regardless of COOP/COEP headers. Because COI is required, SharedArrayBuffer is
// undefined in the renderer context.
//
// Note: require('vm') is explicitly unsupported in Electron's renderer process
// (incompatible with Blink), so we go straight to the polyfill.
//
// The polyfill mirrors exactly the own-property accessor descriptors that
// whatwg-url 16.x inspects at module-load time via Object.getOwnPropertyDescriptor:
//   byteLength   – required by isSharedArrayBuffer() detection
//   growable     – required by isSharedArrayBufferGrowable() detection
//   maxByteLength – standard SAB accessor
// ArrayBuffer cannot be substituted directly because it has `resizable` instead
// of `growable`, causing Object.getOwnPropertyDescriptor(..., "growable") to
// return undefined and the subsequent .get access to throw.
if (typeof SharedArrayBuffer === "undefined") {
  class SharedArrayBufferPolyfill extends ArrayBuffer {
    // Re-declare byteLength as an own accessor so getOwnPropertyDescriptor finds
    // it on this prototype rather than walking up to ArrayBuffer.prototype.
    get byteLength() {
      return ArrayBuffer.prototype.byteLength.call(this);
    }
    // SAB-specific accessors absent on ArrayBuffer.prototype
    get growable() {
      return false;
    }
    get maxByteLength() {
      return ArrayBuffer.prototype.byteLength.call(this);
    }
    grow(_size) {
      throw new TypeError("SharedArrayBuffer.prototype.grow called on incompatible receiver");
    }
    slice(begin, end) {
      const raw = ArrayBuffer.prototype.slice.call(this, begin, end);
      const copy = new SharedArrayBufferPolyfill(raw.byteLength);
      new Uint8Array(copy).set(new Uint8Array(raw));
      return copy;
    }
  }
  Object.defineProperty(SharedArrayBufferPolyfill.prototype, Symbol.toStringTag, {
    value: "SharedArrayBuffer",
    writable: false,
    configurable: true,
  });
  globalThis.SharedArrayBuffer = SharedArrayBufferPolyfill;
}
