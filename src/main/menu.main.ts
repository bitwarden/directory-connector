import {
    Menu,
    MenuItem,
    MenuItemConstructorOptions,
} from 'electron';

import { Main } from '../main';

import { BaseMenu } from 'jslib/electron/baseMenu';

export class MenuMain extends BaseMenu {
    menu: Menu;

    constructor(main: Main) {
        super(main.i18nService, main.windowMain, main.i18nService.t('bitwardenDirectoryConnector'),
            () => main.messagingService.send('logout'));
    }

    init() {
        this.initProperties();
        this.initContextMenu();
        this.initApplicationMenu();
    }

    private initApplicationMenu() {
        const template: MenuItemConstructorOptions[] = [
            this.editMenuItemOptions,
            {
                label: this.i18nService.t('view'),
                submenu: this.viewSubMenuItemOptions,
            },
            this.windowMenuItemOptions,
        ];

        if (process.platform === 'darwin') {
            const firstMenuPart: MenuItemConstructorOptions[] = [
                {
                    label: this.i18nService.t('aboutBitwarden'),
                    role: 'about',
                },
            ];

            template.unshift({
                label: this.appName,
                submenu: firstMenuPart.concat(this.macAppMenuItemOptions),
            });

            // Window menu
            template[template.length - 1].submenu = this.macWindowSubmenuOptions;
        }

        this.menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(this.menu);
    }
}
