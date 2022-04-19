export class ImportError extends Error {
  constructor(message?: string, public passwordRequired: boolean = false) {
    super(message);
  }
}
