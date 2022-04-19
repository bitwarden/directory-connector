import { EventType } from "../../enums/eventType";
import { EventView } from "../view/eventView";

export class Event {
  message: string;
  appIcon: string;
  appName: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  ip: string;
  type: string;

  constructor(event: EventView) {
    this.message = event.humanReadableMessage;
    this.appIcon = event.appIcon;
    this.appName = event.appName;
    this.userId = event.userId;
    this.userName = event.userName;
    this.userEmail = event.userEmail;
    this.date = event.date;
    this.ip = event.ip;
    this.type = EventType[event.type];
  }
}
