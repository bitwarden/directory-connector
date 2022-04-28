import { EmergencyAccessType } from "../../enums/emergencyAccessType";

export class EmergencyAccessInviteRequest {
  email: string;
  type: EmergencyAccessType;
  waitTimeDays: number;
}
