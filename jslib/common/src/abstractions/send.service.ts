import { SendData } from "../models/data/sendData";
import { EncArrayBuffer } from "../models/domain/encArrayBuffer";
import { Send } from "../models/domain/send";
import { SymmetricCryptoKey } from "../models/domain/symmetricCryptoKey";
import { SendView } from "../models/view/sendView";

export abstract class SendService {
  clearCache: () => Promise<void>;
  encrypt: (
    model: SendView,
    file: File | ArrayBuffer,
    password: string,
    key?: SymmetricCryptoKey
  ) => Promise<[Send, EncArrayBuffer]>;
  get: (id: string) => Promise<Send>;
  getAll: () => Promise<Send[]>;
  getAllDecrypted: () => Promise<SendView[]>;
  saveWithServer: (sendData: [Send, EncArrayBuffer]) => Promise<any>;
  upsert: (send: SendData | SendData[]) => Promise<any>;
  replace: (sends: { [id: string]: SendData }) => Promise<any>;
  clear: (userId: string) => Promise<any>;
  delete: (id: string | string[]) => Promise<any>;
  deleteWithServer: (id: string) => Promise<any>;
  removePasswordWithServer: (id: string) => Promise<any>;
}
