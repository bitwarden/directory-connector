import { PaymentMethodType } from "../../enums/paymentMethodType";
import { OrganizationTaxInfoUpdateRequest } from "../request/organizationTaxInfoUpdateRequest";

export class PaymentRequest extends OrganizationTaxInfoUpdateRequest {
  paymentMethodType: PaymentMethodType;
  paymentToken: string;
}
