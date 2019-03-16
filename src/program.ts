import * as chk from 'chalk';
import * as program from 'commander';

import { Main } from './bwdc';

import { ConfigCommand } from './commands/config.command';

import { UpdateCommand } from 'jslib/cli/commands/update.command';

import { Response } from 'jslib/cli/models/response';
import { ListResponse } from 'jslib/cli/models/response/listResponse';
import { MessageResponse } from 'jslib/cli/models/response/messageResponse';
import { StringResponse } from 'jslib/cli/models/response/stringResponse';

const chalk = chk.default;
const writeLn = (s: string, finalLine: boolean = false) => {
    if (finalLine && process.platform === 'win32') {
        process.stdout.write(s);
    } else {
        process.stdout.write(s + '\n');
    }
};

export class Program {
    constructor(private main: Main) { }

    run() {
        program
            .option('--pretty', 'Format output. JSON is tabbed with two spaces.')
            .option('--raw', 'Return raw output instead of a descriptive message.')
            .option('--response', 'Return a JSON formatted version of response output.')
            .option('--quiet', 'Don\'t return anything to stdout.')
            .version(this.main.platformUtilsService.getApplicationVersion(), '-v, --version');

        program.on('option:pretty', () => {
            process.env.BW_PRETTY = 'true';
        });

        program.on('option:raw', () => {
            process.env.BW_RAW = 'true';
        });

        program.on('option:quiet', () => {
            process.env.BW_QUIET = 'true';
        });

        program.on('option:response', () => {
            process.env.BW_RESPONSE = 'true';
        });

        program.on('command:*', () => {
            writeLn(chalk.redBright('Invalid command: ' + program.args.join(' ')));
            writeLn('See --help for a list of available commands.', true);
            process.exitCode = 1;
        });

        program.on('--help', () => {
            writeLn('\n  Examples:');
            writeLn('');
            writeLn('    bwdc login');
            writeLn('', true);
        });

        program
            .command('config <setting> <value>')
            .description('Configure CLI settings.')
            .on('--help', () => {
                writeLn('\n  Settings:');
                writeLn('');
                writeLn('    server - On-premise hosted installation URL.');
                writeLn('');
                writeLn('  Examples:');
                writeLn('');
                writeLn('    bwdc config server https://bw.company.com');
                writeLn('    bwdc config server bitwarden.com');
                writeLn('', true);
            })
            .action(async (setting, value, cmd) => {
                const command = new ConfigCommand(this.main.environmentService);
                const response = await command.run(setting, value, cmd);
                this.processResponse(response);
            });

        program
            .command('update')
            .description('Check for updates.')
            .on('--help', () => {
                writeLn('\n  Notes:');
                writeLn('');
                writeLn('    Returns the URL to download the newest version of this CLI tool.');
                writeLn('');
                writeLn('    Use the `--raw` option to return only the download URL for the update.');
                writeLn('');
                writeLn('  Examples:');
                writeLn('');
                writeLn('    bwdc update');
                writeLn('    bwdc update --raw');
                writeLn('', true);
            })
            .action(async (cmd) => {
                const command = new UpdateCommand(this.main.platformUtilsService, 'directory-connector', 'bwdc');
                const response = await command.run(cmd);
                this.processResponse(response);
            });

        program
            .parse(process.argv);

        if (process.argv.slice(2).length === 0) {
            program.outputHelp();
        }
    }

    private processResponse(response: Response, exitImmediately = false) {
        if (!response.success) {
            if (process.env.BW_QUIET !== 'true') {
                if (process.env.BW_RESPONSE === 'true') {
                    writeLn(this.getJson(response), true);
                } else {
                    writeLn(chalk.redBright(response.message), true);
                }
            }
            if (exitImmediately) {
                process.exit(1);
            } else {
                process.exitCode = 1;
            }
            return;
        }

        if (process.env.BW_RESPONSE === 'true') {
            writeLn(this.getJson(response), true);
        } else if (response.data != null) {
            let out: string = null;
            if (response.data.object === 'string') {
                const data = (response.data as StringResponse).data;
                if (data != null) {
                    out = data;
                }
            } else if (response.data.object === 'list') {
                out = this.getJson((response.data as ListResponse).data);
            } else if (response.data.object === 'message') {
                out = this.getMessage(response);
            } else {
                out = this.getJson(response.data);
            }

            if (out != null && process.env.BW_QUIET !== 'true') {
                writeLn(out, true);
            }
        }
        if (exitImmediately) {
            process.exit(0);
        } else {
            process.exitCode = 0;
        }
    }

    private getJson(obj: any): string {
        if (process.env.BW_PRETTY === 'true') {
            return JSON.stringify(obj, null, '  ');
        } else {
            return JSON.stringify(obj);
        }
    }

    private getMessage(response: Response) {
        const message = (response.data as MessageResponse);
        if (process.env.BW_RAW === 'true' && message.raw != null) {
            return message.raw;
        }

        let out: string = '';
        if (message.title != null) {
            if (message.noColor) {
                out = message.title;
            } else {
                out = chalk.greenBright(message.title);
            }
        }
        if (message.message != null) {
            if (message.title != null) {
                out += '\n';
            }
            out += message.message;
        }
        return out.trim() === '' ? null : out;
    }

    private async exitIfLocked() {
        await this.exitIfNotAuthed();
        const hasKey = await this.main.cryptoService.hasKey();
        if (!hasKey) {
            this.processResponse(Response.error('Vault is locked.'), true);
        }
    }

    private async exitIfAuthed() {
        const authed = await this.main.userService.isAuthenticated();
        if (authed) {
            const email = await this.main.userService.getEmail();
            this.processResponse(Response.error('You are already logged in as ' + email + '.'), true);
        }
    }

    private async exitIfNotAuthed() {
        const authed = await this.main.userService.isAuthenticated();
        if (!authed) {
            this.processResponse(Response.error('You are not logged in.'), true);
        }
    }
}
