export class DecryptParameters<T> {
  encKey: T;
  data: T;
  iv: T;
  macKey: T;
  mac: T;
  macData: T;
}
