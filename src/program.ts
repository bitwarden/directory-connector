import * as path from "path";

import * as chalk from "chalk";
import { Command, OptionValues } from "commander";

import { Utils } from "@/jslib/common/src/misc/utils";
import { BaseProgram } from "@/jslib/node/src/cli/baseProgram";
import { LoginCommand } from "@/jslib/node/src/cli/commands/login.command";
import { LogoutCommand } from "@/jslib/node/src/cli/commands/logout.command";
import { UpdateCommand } from "@/jslib/node/src/cli/commands/update.command";
import { Response } from "@/jslib/node/src/cli/models/response";
import { StringResponse } from "@/jslib/node/src/cli/models/response/stringResponse";

import { Main } from "./bwdc";
import { ClearCacheCommand } from "./commands/clearCache.command";
import { ConfigCommand } from "./commands/config.command";
import { LastSyncCommand } from "./commands/lastSync.command";
import { SyncCommand } from "./commands/sync.command";
import { TestCommand } from "./commands/test.command";

const writeLn = (s: string, finalLine = false, error = false) => {
  const stream = error ? process.stderr : process.stdout;
  if (finalLine && process.platform === "win32") {
    stream.write(s);
  } else {
    stream.write(s + "\n");
  }
};

export class Program extends BaseProgram {
  constructor(private main: Main) {
    super(main.stateService, writeLn);
  }

  async run() {
    const program = new Command()
      .option("--pretty", "Format output. JSON is tabbed with two spaces.")
      .option("--raw", "Return raw output instead of a descriptive message.")
      .option("--response", "Return a JSON formatted version of response output.")
      .option("--cleanexit", "Exit with a success exit code (0) unless an error is thrown.")
      .option("--quiet", "Don't return anything to stdout.")
      .option("--nointeraction", "Do not prompt for interactive user input.")
      .version(await this.main.platformUtilsService.getApplicationVersion(), "-v, --version");

    program.on("option:pretty", () => {
      process.env.BW_PRETTY = "true";
    });

    program.on("option:raw", () => {
      process.env.BW_RAW = "true";
    });

    program.on("option:quiet", () => {
      process.env.BW_QUIET = "true";
    });

    program.on("option:response", () => {
      process.env.BW_RESPONSE = "true";
    });

    program.on("option:cleanexit", () => {
      process.env.BW_CLEANEXIT = "true";
    });

    program.on("option:nointeraction", () => {
      process.env.BW_NOINTERACTION = "true";
    });

    program.on("command:*", () => {
      writeLn(chalk.redBright("Invalid command: " + program.args.join(" ")), false, true);
      writeLn("See --help for a list of available commands.", true, true);
      process.exitCode = 1;
    });

    program.on("--help", () => {
      writeLn("\n  Examples:");
      writeLn("");
      writeLn("    bwdc login");
      writeLn("    bwdc test");
      writeLn("    bwdc sync");
      writeLn("    bwdc last-sync");
      writeLn("    bwdc config server https://bw.company.com");
      writeLn("    bwdc update");
      writeLn("", true);
    });

    program
      .command("login [clientId] [clientSecret]")
      .description("Log into an organization account.", {
        clientId: "Client_id part of your organization's API key",
        clientSecret: "Client_secret part of your organization's API key",
      })
      .action(async (clientId: string, clientSecret: string, options: OptionValues) => {
        await this.exitIfAuthed();
        const command = new LoginCommand(
          this.main.authService,
          this.main.apiService,
          this.main.i18nService,
          this.main.environmentService,
          this.main.passwordGenerationService,
          this.main.cryptoFunctionService,
          this.main.platformUtilsService,
          this.main.stateService,
          this.main.cryptoService,
          this.main.policyService,
          this.main.twoFactorService,
          "connector",
        );

        if (!Utils.isNullOrWhitespace(clientId)) {
          process.env.BW_CLIENTID = clientId;
        }
        if (!Utils.isNullOrWhitespace(clientSecret)) {
          process.env.BW_CLIENTSECRET = clientSecret;
        }

        options = Object.assign(options ?? {}, { apikey: true }); // force apikey use
        const response = await command.run(null, null, options);
        this.processResponse(response);
      });

    program
      .command("logout")
      .description("Log out of the current user account.")
      .on("--help", () => {
        writeLn("\n  Examples:");
        writeLn("");
        writeLn("    bwdc logout");
        writeLn("", true);
      })
      .action(async () => {
        await this.exitIfNotAuthed();
        const command = new LogoutCommand(
          this.main.authService,
          this.main.i18nService,
          async () => await this.main.logout(),
        );
        const response = await command.run();
        this.processResponse(response);
      });

    program
      .command("test")
      .description("Test a simulated sync.")
      .option("-l, --last", "Since the last successful sync.")
      .on("--help", () => {
        writeLn("\n  Examples:");
        writeLn("");
        writeLn("    bwdc test");
        writeLn("    bwdc test --last");
        writeLn("", true);
      })
      .action(async (options: OptionValues) => {
        await this.exitIfNotAuthed();
        const command = new TestCommand(this.main.syncService, this.main.i18nService);
        const response = await command.run(options);
        this.processResponse(response);
      });

    program
      .command("sync")
      .description("Sync the directory.")
      .on("--help", () => {
        writeLn("\n  Examples:");
        writeLn("");
        writeLn("    bwdc sync");
        writeLn("", true);
      })
      .action(async () => {
        await this.exitIfNotAuthed();
        const command = new SyncCommand(this.main.syncService, this.main.i18nService);
        const response = await command.run();
        this.processResponse(response);
      });

    program
      .command("last-sync <object>")
      .description("Get the last successful sync date.")
      .on("--help", () => {
        writeLn("\n  Notes:");
        writeLn("");
        writeLn("    Returns empty response if no sync has been performed for the given object.");
        writeLn("");
        writeLn("  Examples:");
        writeLn("");
        writeLn("    bwdc last-sync groups");
        writeLn("    bwdc last-sync users");
        writeLn("", true);
      })
      .action(async (object: string) => {
        await this.exitIfNotAuthed();
        const command = new LastSyncCommand(this.main.stateService);
        const response = await command.run(object);
        this.processResponse(response);
      });

    program
      .command("config <setting> [value]")
      .description("Configure settings.")
      .option("--secretenv <variable-name>", "Read secret from the named environment variable.")
      .option("--secretfile <filename>", "Read secret from first line of the named file.")
      .on("--help", () => {
        writeLn("\n  Settings:");
        writeLn("");
        writeLn("    server - On-premise hosted installation URL.");
        writeLn("    directory - The type of directory to use.");
        writeLn("    ldap.password - The password for connection to this LDAP server.");
        writeLn("    azure.key - The Azure AD secret key.");
        writeLn("    gsuite.key - The G Suite private key.");
        writeLn("    okta.token - The Okta token.");
        writeLn("    onelogin.secret - The OneLogin client secret.");
        writeLn("");
        writeLn("  Examples:");
        writeLn("");
        writeLn("    bwdc config server https://bw.company.com");
        writeLn("    bwdc config server bitwarden.com");
        writeLn("    bwdc config directory 1");
        writeLn("    bwdc config ldap.password <password>");
        writeLn("    bwdc config ldap.password --secretenv LDAP_PWD");
        writeLn("    bwdc config azure.key <key>");
        writeLn("    bwdc config gsuite.key <key>");
        writeLn("    bwdc config okta.token <token>");
        writeLn("    bwdc config onelogin.secret <secret>");
        writeLn("", true);
      })
      .action(async (setting: string, value: string, options: OptionValues) => {
        const command = new ConfigCommand(
          this.main.environmentService,
          this.main.i18nService,
          this.main.stateService,
        );
        const response = await command.run(setting, value, options);
        this.processResponse(response);
      });

    program
      .command("data-file")
      .description("Path to data.json database file.")
      .on("--help", () => {
        writeLn("\n  Examples:");
        writeLn("");
        writeLn("    bwdc data-file");
        writeLn("", true);
      })
      .action(() => {
        this.processResponse(
          Response.success(new StringResponse(path.join(this.main.dataFilePath, "data.json"))),
        );
      });

    program
      .command("clear-cache")
      .description("Clear the sync cache.")
      .on("--help", () => {
        writeLn("\n  Examples:");
        writeLn("");
        writeLn("    bwdc clear-cache");
        writeLn("", true);
      })
      .action(async (options: OptionValues) => {
        const command = new ClearCacheCommand(this.main.i18nService, this.main.stateService);
        const response = await command.run(options);
        this.processResponse(response);
      });

    program
      .command("update")
      .description("Check for updates.")
      .on("--help", () => {
        writeLn("\n  Notes:");
        writeLn("");
        writeLn("    Returns the URL to download the newest version of this CLI tool.");
        writeLn("");
        writeLn("    Use the `--raw` option to return only the download URL for the update.");
        writeLn("");
        writeLn("  Examples:");
        writeLn("");
        writeLn("    bwdc update");
        writeLn("    bwdc update --raw");
        writeLn("", true);
      })
      .action(async () => {
        const command = new UpdateCommand(
          this.main.platformUtilsService,
          this.main.i18nService,
          "directory-connector",
          "bwdc",
          false,
        );
        const response = await command.run();
        this.processResponse(response);
      });

    program.parse(process.argv);

    if (process.argv.slice(2).length === 0) {
      program.outputHelp();
    }
  }

  async exitIfAuthed() {
    const authed = await this.stateService.getIsAuthenticated();
    if (authed) {
      const id = await this.stateService.getEntityId();
      this.processResponse(
        Response.error("You are already logged in as organization." + id + "."),
        true,
      );
    }
  }

  async exitIfNotAuthed() {
    const authed = await this.stateService.getIsAuthenticated();
    if (!authed) {
      this.processResponse(Response.error("You are not logged in."), true);
    }
  }
}
