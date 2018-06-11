import { NgModule } from '@angular/core';

import { InputVerbatimDirective } from 'jslib/angular/directives/input-verbatim.directive';
import { TrueFalseValueDirective } from 'jslib/angular/directives/true-false-value.directive';

@NgModule({
    imports: [],
    declarations: [
        InputVerbatimDirective,
        TrueFalseValueDirective,
    ],
})
export class DummyModule {
}
