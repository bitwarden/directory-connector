import { components } from "@octokit/openapi-types";
import fetch from "node-fetch";

import { I18nService } from "@/jslib/common/src/abstractions/i18n.service";
import { PlatformUtilsService } from "@/jslib/common/src/abstractions/platformUtils.service";

import { Response } from "../models/response";
import { MessageResponse } from "../models/response/messageResponse";

type GitHubRelease = components["schemas"]["release"];

function isGitHubRelease(value: unknown): value is GitHubRelease {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj.tag_name !== "string") {
    return false;
  }

  if (obj.body !== undefined && obj.body !== null && typeof obj.body !== "string") {
    return false;
  }

  if (obj.assets !== undefined && obj.assets !== null && !Array.isArray(obj.assets)) {
    return false;
  }

  return true;
}

export class UpdateCommand {
  inPkg = false;

  constructor(
    private platformUtilsService: PlatformUtilsService,
    private i18nService: I18nService,
    private repoName: string,
    private executableName: string,
    private showExtendedMessage: boolean,
  ) {
    this.inPkg = !!(process as any).pkg;
  }

  async run(): Promise<Response> {
    const currentVersion = await this.platformUtilsService.getApplicationVersion();

    const response = await fetch(
      "https://api.github.com/repos/bitwarden/" + this.repoName + "/releases/latest",
    );
    if (response.status === 200) {
      const responseJson = await response.json();

      if (!isGitHubRelease(responseJson)) {
        return Response.error("Invalid response from GitHub API");
      }

      const res = new MessageResponse(null, null);

      const tagName: string = responseJson.tag_name;
      if (tagName === "v" + currentVersion) {
        res.title = "No update available.";
        res.noColor = true;
        return Response.success(res);
      }

      let downloadUrl: string = null;
      if (responseJson.assets != null) {
        for (const a of responseJson.assets) {
          const download: string = a.browser_download_url;
          if (download == null) {
            continue;
          }

          if (download.indexOf(".zip") === -1) {
            continue;
          }

          if (
            process.platform === "win32" &&
            download.indexOf(this.executableName + "-windows") > -1
          ) {
            downloadUrl = download;
            break;
          } else if (
            process.platform === "darwin" &&
            download.indexOf(this.executableName + "-macos") > -1
          ) {
            downloadUrl = download;
            break;
          } else if (
            process.platform === "linux" &&
            download.indexOf(this.executableName + "-linux") > -1
          ) {
            downloadUrl = download;
            break;
          }
        }
      }

      res.title = "A new version is available: " + tagName;
      if (downloadUrl == null) {
        downloadUrl = "https://github.com/bitwarden/" + this.repoName + "/releases";
      } else {
        res.raw = downloadUrl;
      }
      res.message = "";
      if (responseJson.body != null && responseJson.body !== "") {
        res.message = responseJson.body + "\n\n";
      }

      res.message += "You can download this update at " + downloadUrl;

      if (this.showExtendedMessage) {
        if (this.inPkg) {
          res.message +=
            "\n\nIf you installed this CLI through a package manager " +
            "you should probably update using its update command instead.";
        } else {
          res.message +=
            "\n\nIf you installed this CLI through NPM " +
            "you should update using `npm install -g @bitwarden/" +
            this.repoName +
            "`";
        }
      }
      return Response.success(res);
    } else {
      return Response.error("Error contacting update API: " + response.status);
    }
  }
}
