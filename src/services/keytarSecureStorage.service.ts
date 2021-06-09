import {
    deletePassword,
    getPassword,
    setPassword,
} from 'keytar';

import { StorageService } from 'jslib-common/abstractions/storage.service';

export class KeytarSecureStorageService implements StorageService {
    constructor(private serviceName: string) { }

    get<T>(key: string): Promise<T> {
        return getPassword(this.serviceName, key).then(val => {
            return JSON.parse(val) as T;
        });
    }

    save(key: string, obj: any): Promise<any> {
        return setPassword(this.serviceName, key, JSON.stringify(obj));
    }

    remove(key: string): Promise<any> {
        return deletePassword(this.serviceName, key);
    }
}
