import {
    app,
    BrowserWindow,
    clipboard,
    dialog,
    ipcMain,
    Menu,
    MenuItem,
    MenuItemConstructorOptions,
    shell,
} from 'electron';

import { Main } from '../main';

import { BaseMenu } from 'jslib/electron/baseMenu';
import { WindowMain } from 'jslib/electron/window.main';

import { ConstantsService } from 'jslib/services/constants.service';

import { I18nService } from 'jslib/abstractions/i18n.service';
import { MessagingService } from 'jslib/abstractions/messaging.service';

export class MenuMain extends BaseMenu {
    menu: Menu;
    logOut: MenuItem;

    constructor(main: Main) {
        super(main.i18nService, main.windowMain, main.i18nService.t('bitwardenDirectoryConnector'),
            () => main.messagingService.send('logout'));
    }

    init() {
        this.initProperties();
        this.initContextMenu();
        this.initApplicationMenu();

        this.logOut = this.menu.getMenuItemById('logOut');
        this.updateApplicationMenuState(false);
    }

    updateApplicationMenuState(isAuthenticated: boolean) {
        this.logOut.enabled = isAuthenticated;
    }

    private initApplicationMenu() {
        const template: MenuItemConstructorOptions[] = [
            {
                label: this.i18nService.t('file'),
                submenu: [this.logOutMenuItemOptions],
            },
            this.editMenuItemOptions,
            {
                label: this.i18nService.t('view'),
                submenu: this.viewSubMenuItemOptions,
            },
            this.windowMenuItemOptions,
        ];

        const firstMenuOptions: MenuItemConstructorOptions[] = [
            { type: 'separator' },
            {
                label: this.i18nService.t('settings'),
                id: 'settings',
                click: () => { /* Something */ },
            },
        ];

        const updateMenuItem = {
            label: this.i18nService.t('checkForUpdates'),
            click: () => { /* Something */ },
            id: 'checkForUpdates',
        };

        if (process.platform === 'darwin') {
            const firstMenuPart: MenuItemConstructorOptions[] = [
                {
                    label: this.i18nService.t('aboutBitwarden'),
                    role: 'about',
                },
                updateMenuItem,
            ];

            template.unshift({
                label: this.appName,
                submenu: firstMenuPart.concat(firstMenuOptions, [
                    { type: 'separator' },
                ], this.macAppMenuItemOptions),
            });

            // Window menu
            template[template.length - 1].submenu = this.macWindowSubmenuOptions;
        } else {
            // File menu
            template[0].submenu = (template[0].submenu as MenuItemConstructorOptions[]).concat(
                firstMenuOptions);

            // About menu
            const aboutMenuAdditions: MenuItemConstructorOptions[] = [
                { type: 'separator' },
                updateMenuItem,
            ];

            aboutMenuAdditions.push(this.aboutMenuItemOptions);

            template[template.length - 1].submenu =
                (template[template.length - 1].submenu as MenuItemConstructorOptions[]).concat(aboutMenuAdditions);
        }

        this.menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(this.menu);
    }
}
