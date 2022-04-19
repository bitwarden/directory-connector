import { Send } from "../domain/send";

import { SendRequest } from "./sendRequest";

export class SendWithIdRequest extends SendRequest {
  id: string;

  constructor(send: Send) {
    super(send);
    this.id = send.id;
  }
}
