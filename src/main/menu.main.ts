import { Menu, MenuItem, MenuItemConstructorOptions } from "electron";

import { BaseMenu } from "jslib-electron/baseMenu";

import { Main } from "../main";

export class MenuMain extends BaseMenu {
  menu: Menu;

  constructor(private main: Main) {
    super(main.i18nService, main.windowMain);
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
        label: this.i18nService.t("view"),
        submenu: this.viewSubMenuItemOptions,
      },
      this.windowMenuItemOptions,
    ];

    if (process.platform === "darwin") {
      const firstMenuPart: MenuItemConstructorOptions[] = [
        {
          label: this.i18nService.t("aboutBitwarden"),
          role: "about",
        },
      ];

      template.unshift({
        label: this.main.i18nService.t("bitwardenDirectoryConnector"),
        submenu: firstMenuPart.concat(this.macAppMenuItemOptions),
      });

      // Window menu
      template[template.length - 1].submenu = this.macWindowSubmenuOptions;
    }

    (template[template.length - 1].submenu as MenuItemConstructorOptions[]).splice(
      1,
      0,
      {
        label: this.main.i18nService.t(
          process.platform === "darwin" ? "hideToMenuBar" : "hideToTray"
        ),
        click: () => this.main.messagingService.send("hideToTray"),
        accelerator: "CmdOrCtrl+Shift+M",
      },
      {
        type: "checkbox",
        label: this.main.i18nService.t("alwaysOnTop"),
        checked: this.windowMain.win.isAlwaysOnTop(),
        click: () => this.main.windowMain.toggleAlwaysOnTop(),
        accelerator: "CmdOrCtrl+Shift+T",
      }
    );

    this.menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(this.menu);
  }
}
