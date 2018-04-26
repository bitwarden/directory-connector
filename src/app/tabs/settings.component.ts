import {
    Component,
    ComponentFactoryResolver,
    ViewChild,
    ViewContainerRef,
} from '@angular/core';

import { ToasterService } from 'angular2-toaster';
import { Angulartics2 } from 'angulartics2';

import { I18nService } from 'jslib/abstractions/i18n.service';

@Component({
    selector: 'app-settings',
    templateUrl: 'settings.component.html',
})
export class SettingsComponent {
    constructor(analytics: Angulartics2, toasterService: ToasterService,
        i18nService: I18nService,  private componentFactoryResolver: ComponentFactoryResolver) {}
}
