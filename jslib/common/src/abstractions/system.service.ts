export abstract class SystemService {
  startProcessReload: () => Promise<void>;
  cancelProcessReload: () => void;
  clearClipboard: (clipboardValue: string, timeoutMs?: number) => Promise<void>;
  clearPendingClipboard: () => Promise<any>;
}
