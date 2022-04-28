import { EventType } from "../../enums/eventType";

export class EventRequest {
  type: EventType;
  cipherId: string;
  date: string;
}
