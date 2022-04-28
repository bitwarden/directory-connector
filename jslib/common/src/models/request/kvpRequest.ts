export class KvpRequest<TK, TV> {
  key: TK;
  value: TV;

  constructor(key: TK, value: TV) {
    this.key = key;
    this.value = value;
  }
}
