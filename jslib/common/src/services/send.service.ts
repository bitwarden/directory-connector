import { ApiService } from "../abstractions/api.service";
import { CryptoService } from "../abstractions/crypto.service";
import { CryptoFunctionService } from "../abstractions/cryptoFunction.service";
import { FileUploadService } from "../abstractions/fileUpload.service";
import { I18nService } from "../abstractions/i18n.service";
import { SendService as SendServiceAbstraction } from "../abstractions/send.service";
import { StateService } from "../abstractions/state.service";
import { SEND_KDF_ITERATIONS } from "../enums/kdfType";
import { SendType } from "../enums/sendType";
import { Utils } from "../misc/utils";
import { SendData } from "../models/data/sendData";
import { EncArrayBuffer } from "../models/domain/encArrayBuffer";
import { EncString } from "../models/domain/encString";
import { Send } from "../models/domain/send";
import { SendFile } from "../models/domain/sendFile";
import { SendText } from "../models/domain/sendText";
import { SymmetricCryptoKey } from "../models/domain/symmetricCryptoKey";
import { SendRequest } from "../models/request/sendRequest";
import { ErrorResponse } from "../models/response/errorResponse";
import { SendResponse } from "../models/response/sendResponse";
import { SendView } from "../models/view/sendView";

export class SendService implements SendServiceAbstraction {
  constructor(
    private cryptoService: CryptoService,
    private apiService: ApiService,
    private fileUploadService: FileUploadService,
    private i18nService: I18nService,
    private cryptoFunctionService: CryptoFunctionService,
    private stateService: StateService
  ) {}

  async clearCache(): Promise<void> {
    await this.stateService.setDecryptedSends(null);
  }

  async encrypt(
    model: SendView,
    file: File | ArrayBuffer,
    password: string,
    key?: SymmetricCryptoKey
  ): Promise<[Send, EncArrayBuffer]> {
    let fileData: EncArrayBuffer = null;
    const send = new Send();
    send.id = model.id;
    send.type = model.type;
    send.disabled = model.disabled;
    send.hideEmail = model.hideEmail;
    send.maxAccessCount = model.maxAccessCount;
    if (model.key == null) {
      model.key = await this.cryptoFunctionService.randomBytes(16);
      model.cryptoKey = await this.cryptoService.makeSendKey(model.key);
    }
    if (password != null) {
      const passwordHash = await this.cryptoFunctionService.pbkdf2(
        password,
        model.key,
        "sha256",
        SEND_KDF_ITERATIONS
      );
      send.password = Utils.fromBufferToB64(passwordHash);
    }
    send.key = await this.cryptoService.encrypt(model.key, key);
    send.name = await this.cryptoService.encrypt(model.name, model.cryptoKey);
    send.notes = await this.cryptoService.encrypt(model.notes, model.cryptoKey);
    if (send.type === SendType.Text) {
      send.text = new SendText();
      send.text.text = await this.cryptoService.encrypt(model.text.text, model.cryptoKey);
      send.text.hidden = model.text.hidden;
    } else if (send.type === SendType.File) {
      send.file = new SendFile();
      if (file != null) {
        if (file instanceof ArrayBuffer) {
          const [name, data] = await this.encryptFileData(
            model.file.fileName,
            file,
            model.cryptoKey
          );
          send.file.fileName = name;
          fileData = data;
        } else {
          fileData = await this.parseFile(send, file, model.cryptoKey);
        }
      }
    }

    return [send, fileData];
  }

  async get(id: string): Promise<Send> {
    const sends = await this.stateService.getEncryptedSends();
    // eslint-disable-next-line
    if (sends == null || !sends.hasOwnProperty(id)) {
      return null;
    }

    return new Send(sends[id]);
  }

  async getAll(): Promise<Send[]> {
    const sends = await this.stateService.getEncryptedSends();
    const response: Send[] = [];
    for (const id in sends) {
      // eslint-disable-next-line
      if (sends.hasOwnProperty(id)) {
        response.push(new Send(sends[id]));
      }
    }
    return response;
  }

  async getAllDecrypted(): Promise<SendView[]> {
    let decSends = await this.stateService.getDecryptedSends();
    if (decSends != null) {
      return decSends;
    }

    decSends = [];
    const hasKey = await this.cryptoService.hasKey();
    if (!hasKey) {
      throw new Error("No key.");
    }

    const promises: Promise<any>[] = [];
    const sends = await this.getAll();
    sends.forEach((send) => {
      promises.push(send.decrypt().then((f) => decSends.push(f)));
    });

    await Promise.all(promises);
    decSends.sort(Utils.getSortFunction(this.i18nService, "name"));

    await this.stateService.setDecryptedSends(decSends);
    return decSends;
  }

  async saveWithServer(sendData: [Send, EncArrayBuffer]): Promise<any> {
    const request = new SendRequest(sendData[0], sendData[1]?.buffer.byteLength);
    let response: SendResponse;
    if (sendData[0].id == null) {
      if (sendData[0].type === SendType.Text) {
        response = await this.apiService.postSend(request);
      } else {
        try {
          const uploadDataResponse = await this.apiService.postFileTypeSend(request);
          response = uploadDataResponse.sendResponse;

          await this.fileUploadService.uploadSendFile(
            uploadDataResponse,
            sendData[0].file.fileName,
            sendData[1]
          );
        } catch (e) {
          if (e instanceof ErrorResponse && (e as ErrorResponse).statusCode === 404) {
            response = await this.legacyServerSendFileUpload(sendData, request);
          } else if (e instanceof ErrorResponse) {
            throw new Error((e as ErrorResponse).getSingleMessage());
          } else {
            throw e;
          }
        }
      }
      sendData[0].id = response.id;
      sendData[0].accessId = response.accessId;
    } else {
      response = await this.apiService.putSend(sendData[0].id, request);
    }

    const userId = await this.stateService.getUserId();
    const data = new SendData(response, userId);
    await this.upsert(data);
  }

  /**
   * @deprecated Mar 25 2021: This method has been deprecated in favor of direct uploads.
   * This method still exists for backward compatibility with old server versions.
   */
  async legacyServerSendFileUpload(
    sendData: [Send, EncArrayBuffer],
    request: SendRequest
  ): Promise<SendResponse> {
    const fd = new FormData();
    try {
      const blob = new Blob([sendData[1].buffer], { type: "application/octet-stream" });
      fd.append("model", JSON.stringify(request));
      fd.append("data", blob, sendData[0].file.fileName.encryptedString);
    } catch (e) {
      if (Utils.isNode && !Utils.isBrowser) {
        fd.append("model", JSON.stringify(request));
        fd.append(
          "data",
          Buffer.from(sendData[1].buffer) as any,
          {
            filepath: sendData[0].file.fileName.encryptedString,
            contentType: "application/octet-stream",
          } as any
        );
      } else {
        throw e;
      }
    }
    return await this.apiService.postSendFileLegacy(fd);
  }

  async upsert(send: SendData | SendData[]): Promise<any> {
    let sends = await this.stateService.getEncryptedSends();
    if (sends == null) {
      sends = {};
    }

    if (send instanceof SendData) {
      const s = send as SendData;
      sends[s.id] = s;
    } else {
      (send as SendData[]).forEach((s) => {
        sends[s.id] = s;
      });
    }

    await this.replace(sends);
  }

  async replace(sends: { [id: string]: SendData }): Promise<any> {
    await this.stateService.setDecryptedSends(null);
    await this.stateService.setEncryptedSends(sends);
  }

  async clear(): Promise<any> {
    await this.stateService.setDecryptedSends(null);
    await this.stateService.setEncryptedSends(null);
  }

  async delete(id: string | string[]): Promise<any> {
    const sends = await this.stateService.getEncryptedSends();
    if (sends == null) {
      return;
    }

    if (typeof id === "string") {
      if (sends[id] == null) {
        return;
      }
      delete sends[id];
    } else {
      (id as string[]).forEach((i) => {
        delete sends[i];
      });
    }

    await this.replace(sends);
  }

  async deleteWithServer(id: string): Promise<any> {
    await this.apiService.deleteSend(id);
    await this.delete(id);
  }

  async removePasswordWithServer(id: string): Promise<any> {
    const response = await this.apiService.putSendRemovePassword(id);
    const userId = await this.stateService.getUserId();
    const data = new SendData(response, userId);
    await this.upsert(data);
  }

  private parseFile(send: Send, file: File, key: SymmetricCryptoKey): Promise<EncArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = async (evt) => {
        try {
          const [name, data] = await this.encryptFileData(
            file.name,
            evt.target.result as ArrayBuffer,
            key
          );
          send.file.fileName = name;
          resolve(data);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => {
        reject("Error reading file.");
      };
    });
  }

  private async encryptFileData(
    fileName: string,
    data: ArrayBuffer,
    key: SymmetricCryptoKey
  ): Promise<[EncString, EncArrayBuffer]> {
    const encFileName = await this.cryptoService.encrypt(fileName, key);
    const encFileData = await this.cryptoService.encryptToBytes(data, key);
    return [encFileName, encFileData];
  }
}
