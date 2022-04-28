export interface ExportData {
  accounts?: AccountsEntity[] | null;
}
export interface AccountsEntity {
  attrs: AccountAttributes;
  vaults?: VaultsEntity[] | null;
}
export interface AccountAttributes {
  accountName: string;
  name: string;
  avatar: string;
  email: string;
  uuid: string;
  domain: string;
}
export interface VaultsEntity {
  attrs: VaultAttributes;
  items?: Item[] | null;
}
export interface VaultAttributes {
  uuid: string;
  desc: string;
  avatar: string;
  name: string;
  type: string;
}

export enum CategoryEnum {
  Login = "001",
  CreditCard = "002",
  SecureNote = "003",
  Identity = "004",
  Password = "005",
  Document = "006",
  SoftwareLicense = "100",
  BankAccount = "101",
  Database = "102",
  DriversLicense = "103",
  OutdoorLicense = "104",
  Membership = "105",
  Passport = "106",
  RewardsProgram = "107",
  SocialSecurityNumber = "108",
  WirelessRouter = "109",
  Server = "110",
  EmailAccount = "111",
  API_Credential = "112",
  MedicalRecord = "113",
}

export interface Item {
  uuid: string;
  favIndex: number;
  createdAt: number;
  updatedAt: number;
  trashed?: boolean;
  categoryUuid: string;
  details: Details;
  overview: Overview;
}
export interface Details {
  loginFields?: (LoginFieldsEntity | null)[] | null;
  notesPlain?: string | null;
  sections?: (SectionsEntity | null)[] | null;
  passwordHistory?: (PasswordHistoryEntity | null)[] | null;
  documentAttributes?: DocumentAttributes | null;
  password?: string | null;
}

export enum LoginFieldTypeEnum {
  TextOrHtml = "T",
  EmailAddress = "E",
  URL = "U",
  Number = "N",
  Password = "P",
  TextArea = "A",
  PhoneNumber = "T",
  CheckBox = "C",
}
export interface LoginFieldsEntity {
  value: string;
  id: string;
  name: string;
  fieldType: LoginFieldTypeEnum | string;
  designation?: string | null;
}
export interface SectionsEntity {
  title: string;
  name?: string | null;
  fields?: FieldsEntity[] | null;
}
export interface FieldsEntity {
  title: string;
  id: string;
  value: Value;
  indexAtSource: number;
  guarded: boolean;
  multiline: boolean;
  dontGenerate: boolean;
  placeholder?: string;
  inputTraits: InputTraits;
  clipboardFilter?: string | null;
}
export interface Value {
  totp?: string | null;
  date?: number | null;
  string?: string | null;
  concealed?: string | null;
  email?: Email | null;
  phone?: string | null;
  menu?: string | null;
  gender?: string | null;
  monthYear?: number | null;
  url?: string | null;
  address?: Address | null;
  creditCardType?: string | null;
  creditCardNumber?: string | null;
  reference?: string | null;
}

export interface Email {
  email_address: string;
  provider: string;
}

export interface Address {
  street: string;
  city: string;
  country: string;
  zip: string;
  state: string;
}
export interface InputTraits {
  keyboard: string;
  correction: string;
  capitalization: string;
}
export interface PasswordHistoryEntity {
  value: string;
  time: number;
}
export interface DocumentAttributes {
  fileName: string;
  documentId: string;
  decryptedSize: number;
}
export interface Overview {
  subtitle: string;
  title: string;
  url: string;
  urls?: UrlsEntity[] | null;
  ps?: number | null;
  pbe?: number | null;
  pgrng?: boolean | null;
  tags?: string[] | null;
}
export interface UrlsEntity {
  label: string;
  url: string;
}
