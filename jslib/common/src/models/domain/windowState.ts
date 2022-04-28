export class WindowState {
  width?: number;
  height?: number;
  isMaximized?: boolean;
  // TODO: displayBounds is an Electron.Rectangle.
  // We need to establish some kind of client-specific global state, similiar to the way we already extend a base Account.
  displayBounds: any;
  x?: number;
  y?: number;
}
