import {
    Component,
    ComponentFactoryResolver,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';

import { ToasterService } from 'angular2-toaster';
import { Angulartics2 } from 'angulartics2';

import { I18nService } from 'jslib/abstractions/i18n.service';

import { ModalComponent } from 'jslib/angular/components/modal.component';

@Component({
    selector: 'app-dashboard',
    templateUrl: 'dashboard.component.html',
})
export class DashboardComponent {
    @ViewChild('settings', { read: ViewContainerRef }) settingsModal: ViewContainerRef;

    constructor(analytics: Angulartics2, toasterService: ToasterService,
        i18nService: I18nService,  private componentFactoryResolver: ComponentFactoryResolver) {}
}
