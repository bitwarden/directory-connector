import { UriMatchType } from "../../enums/uriMatchType";
import { Utils } from "../../misc/utils";
import { LoginUri } from "../domain/loginUri";

import { View } from "./view";

const CanLaunchWhitelist = [
  "https://",
  "http://",
  "ssh://",
  "ftp://",
  "sftp://",
  "irc://",
  "vnc://",
  // https://docs.microsoft.com/en-us/windows-server/remote/remote-desktop-services/clients/remote-desktop-uri
  "rdp://", // Legacy RDP URI scheme
  "ms-rd:", // Preferred RDP URI scheme
  "chrome://",
  "iosapp://",
  "androidapp://",
];

export class LoginUriView implements View {
  match: UriMatchType = null;

  private _uri: string = null;
  private _domain: string = null;
  private _hostname: string = null;
  private _host: string = null;
  private _canLaunch: boolean = null;

  constructor(u?: LoginUri) {
    if (!u) {
      return;
    }

    this.match = u.match;
  }

  get uri(): string {
    return this._uri;
  }
  set uri(value: string) {
    this._uri = value;
    this._domain = null;
    this._canLaunch = null;
  }

  get domain(): string {
    if (this._domain == null && this.uri != null) {
      this._domain = Utils.getDomain(this.uri);
      if (this._domain === "") {
        this._domain = null;
      }
    }

    return this._domain;
  }

  get hostname(): string {
    if (this.match === UriMatchType.RegularExpression) {
      return null;
    }
    if (this._hostname == null && this.uri != null) {
      this._hostname = Utils.getHostname(this.uri);
      if (this._hostname === "") {
        this._hostname = null;
      }
    }

    return this._hostname;
  }

  get host(): string {
    if (this.match === UriMatchType.RegularExpression) {
      return null;
    }
    if (this._host == null && this.uri != null) {
      this._host = Utils.getHost(this.uri);
      if (this._host === "") {
        this._host = null;
      }
    }

    return this._host;
  }

  get hostnameOrUri(): string {
    return this.hostname != null ? this.hostname : this.uri;
  }

  get hostOrUri(): string {
    return this.host != null ? this.host : this.uri;
  }

  get isWebsite(): boolean {
    return (
      this.uri != null &&
      (this.uri.indexOf("http://") === 0 ||
        this.uri.indexOf("https://") === 0 ||
        (this.uri.indexOf("://") < 0 && Utils.tldEndingRegex.test(this.uri)))
    );
  }

  get canLaunch(): boolean {
    if (this._canLaunch != null) {
      return this._canLaunch;
    }
    if (this.uri != null && this.match !== UriMatchType.RegularExpression) {
      const uri = this.launchUri;
      for (let i = 0; i < CanLaunchWhitelist.length; i++) {
        if (uri.indexOf(CanLaunchWhitelist[i]) === 0) {
          this._canLaunch = true;
          return this._canLaunch;
        }
      }
    }
    this._canLaunch = false;
    return this._canLaunch;
  }

  get launchUri(): string {
    return this.uri.indexOf("://") < 0 && Utils.tldEndingRegex.test(this.uri)
      ? "http://" + this.uri
      : this.uri;
  }
}
