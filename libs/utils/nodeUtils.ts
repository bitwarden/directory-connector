import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

import { HttpsProxyAgent } from "https-proxy-agent";
import { EnvHttpProxyAgent } from "undici";

export class NodeUtils {
  static mkdirpSync(targetDir: string, mode = "700", relative = false, relativeDir: string = null) {
    const initialDir = path.isAbsolute(targetDir) ? path.sep : "";
    const baseDir = relative ? (relativeDir != null ? relativeDir : __dirname) : ".";
    targetDir.split(path.sep).reduce((parentDir, childDir) => {
      const dir = path.resolve(baseDir, parentDir, childDir);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, mode);
      }
      return dir;
    }, initialDir);
  }
  static readFirstLine(fileName: string) {
    return new Promise<string>((resolve, reject) => {
      const readStream = fs.createReadStream(fileName, { encoding: "utf8" });
      const readInterface = readline.createInterface(readStream);
      readInterface
        .on("line", (line) => {
          readStream.close();
          resolve(line);
        })
        .on("error", (err) => reject(err));
    });
  }

  static getProxyUrl(): string | undefined {
    return (
      process.env.https_proxy ||
      process.env.HTTPS_PROXY ||
      process.env.http_proxy ||
      process.env.HTTP_PROXY ||
      undefined
    );
  }

  static getProxyAgent(): HttpsProxyAgent<string> | undefined {
    const proxyUrl = NodeUtils.getProxyUrl();
    return proxyUrl != null ? new HttpsProxyAgent(proxyUrl) : undefined;
  }

  /**
   * Graph requests go through the global fetch, which ignores the proxy
   * environment variables, so hand it a dispatcher that honors them.
   * `dispatcher` is an undici extension that RequestInit doesn't declare.
   */
  static getFetchOptions(): RequestInit | undefined {
    return NodeUtils.getProxyUrl() != null
      ? ({ dispatcher: new EnvHttpProxyAgent() } as RequestInit)
      : undefined;
  }
}
