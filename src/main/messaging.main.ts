import {
    app,
    ipcMain,
} from 'electron';

import { WindowMain } from 'jslib/electron/window.main';

import { MenuMain } from './menu.main';

const SyncCheckInterval = 60 * 1000; // 1 minute

export class MessagingMain {
    private syncTimeout: NodeJS.Timer;

    constructor(private windowMain: WindowMain, private menuMain: MenuMain) { }

    init() {
        this.scheduleNextSync();
        ipcMain.on('messagingService', async (event: any, message: any) => this.onMessage(message));
    }

    onMessage(message: any) {
        switch (message.command) {
            case 'scheduleNextDirSync':
                this.scheduleNextSync();
                break;
            case 'cancelDirSync':
                this.windowMain.win.webContents.send('messagingService', {
                    command: 'syncScheduleStopped',
                });
                if (this.syncTimeout) {
                    global.clearTimeout(this.syncTimeout);
                }
                break;
            default:
                break;
        }
    }

    private scheduleNextSync() {
        this.windowMain.win.webContents.send('messagingService', {
            command: 'syncScheduleStarted',
        });

        if (this.syncTimeout) {
            global.clearTimeout(this.syncTimeout);
        }

        this.syncTimeout = global.setTimeout(() => {
            if (this.windowMain.win == null) {
                return;
            }

            this.windowMain.win.webContents.send('messagingService', {
                command: 'checkDirSync',
            });
        }, SyncCheckInterval);
    }
}
