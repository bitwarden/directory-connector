import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { isDev } from 'jslib/electron/utils';

// tslint:disable-next-line
require('../scss/styles.scss');
// tslint:disable-next-line
require('../../jslib/src/misc/duo.js');

import { AppModule } from './app.module';

if (!isDev()) {
    enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule);
