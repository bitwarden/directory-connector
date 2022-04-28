import { UriMatchType } from "../../enums/uriMatchType";
import { BaseResponse } from "../response/baseResponse";

export class LoginUriApi extends BaseResponse {
  uri: string;
  match: UriMatchType = null;

  constructor(data: any = null) {
    super(data);
    if (data == null) {
      return;
    }
    this.uri = this.getResponseProperty("Uri");
    const match = this.getResponseProperty("Match");
    this.match = match != null ? match : null;
  }
}
