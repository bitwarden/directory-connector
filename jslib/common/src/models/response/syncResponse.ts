import { BaseResponse } from "./baseResponse";
import { CipherResponse } from "./cipherResponse";
import { CollectionDetailsResponse } from "./collectionResponse";
import { DomainsResponse } from "./domainsResponse";
import { FolderResponse } from "./folderResponse";
import { PolicyResponse } from "./policyResponse";
import { ProfileResponse } from "./profileResponse";
import { SendResponse } from "./sendResponse";

export class SyncResponse extends BaseResponse {
  profile?: ProfileResponse;
  folders: FolderResponse[] = [];
  collections: CollectionDetailsResponse[] = [];
  ciphers: CipherResponse[] = [];
  domains?: DomainsResponse;
  policies?: PolicyResponse[] = [];
  sends: SendResponse[] = [];

  constructor(response: any) {
    super(response);

    const profile = this.getResponseProperty("Profile");
    if (profile != null) {
      this.profile = new ProfileResponse(profile);
    }

    const folders = this.getResponseProperty("Folders");
    if (folders != null) {
      this.folders = folders.map((f: any) => new FolderResponse(f));
    }

    const collections = this.getResponseProperty("Collections");
    if (collections != null) {
      this.collections = collections.map((c: any) => new CollectionDetailsResponse(c));
    }

    const ciphers = this.getResponseProperty("Ciphers");
    if (ciphers != null) {
      this.ciphers = ciphers.map((c: any) => new CipherResponse(c));
    }

    const domains = this.getResponseProperty("Domains");
    if (domains != null) {
      this.domains = new DomainsResponse(domains);
    }

    const policies = this.getResponseProperty("Policies");
    if (policies != null) {
      this.policies = policies.map((p: any) => new PolicyResponse(p));
    }

    const sends = this.getResponseProperty("Sends");
    if (sends != null) {
      this.sends = sends.map((s: any) => new SendResponse(s));
    }
  }
}
