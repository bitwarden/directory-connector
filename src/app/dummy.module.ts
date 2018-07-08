import { NgModule } from '@angular/core';

import { InputVerbatimDirective } from 'jslib/angular/directives/input-verbatim.directive';
import { TrueFalseValueDirective } from 'jslib/angular/directives/true-false-value.directive';
import { SearchPipe } from 'jslib/angular/pipes/search.pipe';

@NgModule({
    imports: [],
    declarations: [
        InputVerbatimDirective,
        TrueFalseValueDirective,
        SearchPipe,
    ],
})
export class DummyModule {
}
