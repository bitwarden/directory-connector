import * as chk from 'chalk';
import * as program from 'commander';

import { Main } from './bwdc';

import { ConfigCommand } from './commands/config.command';
import { SyncCommand } from './commands/sync.command';
import { TestCommand } from './commands/test.command';

import { UpdateCommand } from 'jslib/cli/commands/update.command';

import { BaseProgram } from 'jslib/cli/baseProgram';

const chalk = chk.default;
const writeLn = (s: string, finalLine: boolean = false) => {
    if (finalLine && process.platform === 'win32') {
        process.stdout.write(s);
    } else {
        process.stdout.write(s + '\n');
    }
};

export class Program extends BaseProgram {
    constructor(private main: Main) {
        super(main.userService, writeLn);
    }

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
            writeLn('    bwdc test');
            writeLn('    bwdc sync');
            writeLn('    bwdc config server https://bw.company.com');
            writeLn('    bwdc update');
            writeLn('', true);
        });

        program
            .command('test')
            .description('Test a simulated sync.')
            .option('-l, --last', 'Since the last successful sync.')
            .on('--help', () => {
                writeLn('\n  Examples:');
                writeLn('');
                writeLn('    bwdc test');
                writeLn('    bwdc test --last');
                writeLn('', true);
            })
            .action(async (cmd) => {
                await this.exitIfNotAuthed();
                const command = new TestCommand(this.main.syncService, this.main.i18nService);
                const response = await command.run(cmd);
                this.processResponse(response);
            });

        program
            .command('sync')
            .description('Sync the directory.')
            .on('--help', () => {
                writeLn('\n  Examples:');
                writeLn('');
                writeLn('    bwdc sync');
                writeLn('', true);
            })
            .action(async (cmd) => {
                await this.exitIfNotAuthed();
                const command = new SyncCommand(this.main.syncService, this.main.i18nService);
                const response = await command.run(cmd);
                this.processResponse(response);
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
                const command = new ConfigCommand(this.main.environmentService, this.main.i18nService);
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
}
