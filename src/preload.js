// The preload is loaded by Electron as a real filesystem file (build/preload.js),
// so Node.js sets __dirname to the build/ directory. Expose it as a global so
// renderer code can use it to locate app resources (e.g. locale files) regardless
// of which protocol the page was loaded from. Without this, scripts loaded via the
// app:// custom protocol receive a __dirname that resolves inside electron.asar.
globalThis.__appDirname = __dirname;
