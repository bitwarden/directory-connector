import { Observable, Subject } from "rxjs";
import { first } from "rxjs/operators";

export class ModalRef {
  onCreated: Observable<HTMLElement>; // Modal added to the DOM.
  onClose: Observable<any>; // Initiated close.
  onClosed: Observable<any>; // Modal was closed (Remove element from DOM)
  onShow: Observable<void>; // Start showing modal
  onShown: Observable<void>; // Modal is fully visible

  private readonly _onCreated = new Subject<HTMLElement>();
  private readonly _onClose = new Subject<any>();
  private readonly _onClosed = new Subject<any>();
  private readonly _onShow = new Subject<void>();
  private readonly _onShown = new Subject<void>();
  private lastResult: any;

  constructor() {
    this.onCreated = this._onCreated.asObservable();
    this.onClose = this._onClose.asObservable();
    this.onClosed = this._onClosed.asObservable();
    this.onShow = this._onShow.asObservable();
    this.onShown = this._onShow.asObservable();
  }

  show() {
    this._onShow.next();
  }

  shown() {
    this._onShown.next();
  }

  close(result?: any) {
    this.lastResult = result;
    this._onClose.next(result);
  }

  closed() {
    this._onClosed.next(this.lastResult);
  }

  created(el: HTMLElement) {
    this._onCreated.next(el);
  }

  onClosedPromise(): Promise<any> {
    return this.onClosed.pipe(first()).toPromise();
  }
}
