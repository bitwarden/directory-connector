import { ConfigurableFocusTrap, ConfigurableFocusTrapFactory } from "@angular/cdk/a11y";
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  ElementRef,
  OnDestroy,
  Type,
  ViewChild,
  ViewContainerRef,
  inject,
} from "@angular/core";

import { ModalService } from "@/src-gui/angular/services/modal.service";

import { ModalRef } from "./modal.ref";

@Component({
  selector: "app-modal",
  template: "<ng-template #modalContent></ng-template>",
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class DynamicModalComponent implements AfterViewInit, OnDestroy {
  componentRef: ComponentRef<any>;

  @ViewChild("modalContent", { read: ViewContainerRef, static: true })
  modalContentRef: ViewContainerRef;

  childComponentType: Type<any>;
  setComponentParameters: (component: any) => void;

  private focusTrap: ConfigurableFocusTrap;

  private modalService = inject(ModalService);
  private cd = inject(ChangeDetectorRef);
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private focusTrapFactory = inject(ConfigurableFocusTrapFactory);
  modalRef = inject(ModalRef);

  ngAfterViewInit() {
    this.loadChildComponent(this.childComponentType);
    if (this.setComponentParameters != null) {
      this.setComponentParameters(this.componentRef.instance);
    }
    this.cd.detectChanges();

    this.modalRef.created(this.el.nativeElement);
    this.focusTrap = this.focusTrapFactory.create(
      this.el.nativeElement.querySelector(".modal-dialog"),
    );
    if (this.el.nativeElement.querySelector("[appAutoFocus]") == null) {
      this.focusTrap.focusFirstTabbableElementWhenReady();
    }
  }

  loadChildComponent(componentType: Type<any>) {
    const componentFactory = this.modalService.resolveComponentFactory(componentType);

    this.modalContentRef.clear();
    this.componentRef = this.modalContentRef.createComponent(componentFactory);
  }

  ngOnDestroy() {
    if (this.componentRef) {
      this.componentRef.destroy();
    }
    this.focusTrap.destroy();
  }

  close() {
    this.modalRef.close();
  }

  getFocus() {
    const autoFocusEl = this.el.nativeElement.querySelector("[appAutoFocus]") as HTMLElement;
    autoFocusEl?.focus();
  }
}
