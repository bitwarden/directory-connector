import { Menu, MenuItemConstructorOptions } from "electron";

import { I18nService } from "jslib-common/abstractions/i18n.service";

import { WindowMain } from "./window.main";

export class BaseMenu {
  protected editMenuItemOptions: MenuItemConstructorOptions;
  protected viewSubMenuItemOptions: MenuItemConstructorOptions[];
  protected windowMenuItemOptions: MenuItemConstructorOptions;
  protected macAppMenuItemOptions: MenuItemConstructorOptions[];
  protected macWindowSubmenuOptions: MenuItemConstructorOptions[];

  constructor(protected i18nService: I18nService, protected windowMain: WindowMain) {}

  protected initProperties() {
    this.editMenuItemOptions = {
      label: this.i18nService.t("edit"),
      submenu: [
        {
          label: this.i18nService.t("undo"),
          role: "undo",
        },
        {
          label: this.i18nService.t("redo"),
          role: "redo",
        },
        { type: "separator" },
        {
          label: this.i18nService.t("cut"),
          role: "cut",
        },
        {
          label: this.i18nService.t("copy"),
          role: "copy",
        },
        {
          label: this.i18nService.t("paste"),
          role: "paste",
        },
        { type: "separator" },
        {
          label: this.i18nService.t("selectAll"),
          role: "selectAll",
        },
      ],
    };

    this.viewSubMenuItemOptions = [
      {
        label: this.i18nService.t("zoomIn"),
        role: "zoomIn",
        accelerator: "CmdOrCtrl+=",
      },
      {
        label: this.i18nService.t("zoomOut"),
        role: "zoomOut",
        accelerator: "CmdOrCtrl+-",
      },
      {
        label: this.i18nService.t("resetZoom"),
        role: "resetZoom",
        accelerator: "CmdOrCtrl+0",
      },
      { type: "separator" },
      {
        label: this.i18nService.t("toggleFullScreen"),
        role: "togglefullscreen",
      },
      { type: "separator" },
      {
        label: this.i18nService.t("reload"),
        role: "forceReload",
      },
      {
        label: this.i18nService.t("toggleDevTools"),
        role: "toggleDevTools",
        accelerator: "F12",
      },
    ];

    this.windowMenuItemOptions = {
      label: this.i18nService.t("window"),
      role: "window",
      submenu: [
        {
          label: this.i18nService.t("minimize"),
          role: "minimize",
        },
        {
          label: this.i18nService.t("close"),
          role: "close",
        },
      ],
    };

    if (process.platform === "darwin") {
      this.macAppMenuItemOptions = [
        {
          label: this.i18nService.t("services"),
          role: "services",
          submenu: [],
        },
        { type: "separator" },
        {
          label: this.i18nService.t("hideBitwarden"),
          role: "hide",
        },
        {
          label: this.i18nService.t("hideOthers"),
          role: "hideOthers",
        },
        {
          label: this.i18nService.t("showAll"),
          role: "unhide",
        },
        { type: "separator" },
        {
          label: this.i18nService.t("quitBitwarden"),
          role: "quit",
        },
      ];

      this.macWindowSubmenuOptions = [
        {
          label: this.i18nService.t("minimize"),
          role: "minimize",
        },
        {
          label: this.i18nService.t("zoom"),
          role: "zoom",
        },
        { type: "separator" },
        {
          label: this.i18nService.t("bringAllToFront"),
          role: "front",
        },
        {
          label: this.i18nService.t("close"),
          role: "close",
        },
      ];
    }
  }

  protected initContextMenu() {
    if (this.windowMain.win == null) {
      return;
    }

    const selectionMenu = Menu.buildFromTemplate([
      {
        label: this.i18nService.t("copy"),
        role: "copy",
      },
      { type: "separator" },
      {
        label: this.i18nService.t("selectAll"),
        role: "selectAll",
      },
    ]);

    const inputMenu = Menu.buildFromTemplate([
      {
        label: this.i18nService.t("undo"),
        role: "undo",
      },
      {
        label: this.i18nService.t("redo"),
        role: "redo",
      },
      { type: "separator" },
      {
        label: this.i18nService.t("cut"),
        role: "cut",
        enabled: false,
      },
      {
        label: this.i18nService.t("copy"),
        role: "copy",
        enabled: false,
      },
      {
        label: this.i18nService.t("paste"),
        role: "paste",
      },
      { type: "separator" },
      {
        label: this.i18nService.t("selectAll"),
        role: "selectAll",
      },
    ]);

    const inputSelectionMenu = Menu.buildFromTemplate([
      {
        label: this.i18nService.t("cut"),
        role: "cut",
      },
      {
        label: this.i18nService.t("copy"),
        role: "copy",
      },
      {
        label: this.i18nService.t("paste"),
        role: "paste",
      },
      { type: "separator" },
      {
        label: this.i18nService.t("selectAll"),
        role: "selectAll",
      },
    ]);

    this.windowMain.win.webContents.on("context-menu", (e, props) => {
      const selected = props.selectionText && props.selectionText.trim() !== "";
      if (props.isEditable && selected) {
        inputSelectionMenu.popup({ window: this.windowMain.win });
      } else if (props.isEditable) {
        inputMenu.popup({ window: this.windowMain.win });
      } else if (selected) {
        selectionMenu.popup({ window: this.windowMain.win });
      }
    });
  }
}
