import { EmergencyAccessType } from "../../enums/emergencyAccessType";

export class EmergencyAccessUpdateRequest {
  type: EmergencyAccessType;
  waitTimeDays: number;
  keyEncrypted?: string;
}
