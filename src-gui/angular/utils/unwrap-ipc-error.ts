/**
 * Strips Electron's own IPC wrapping from a rejected `ipcRenderer.invoke` error.
 */
export function unwrapIpcError<T>(e: T): T {
  if (!(e instanceof Error) || typeof e.message !== "string") {
    return e;
  }

  let message = e.message.replace(/^Error invoking remote method '[^']*':\s*/, "");
  message = message.replace(/^Error:\s*/, "");
  e.message = message;

  return e;
}
