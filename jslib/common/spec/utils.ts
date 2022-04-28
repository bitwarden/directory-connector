import Substitute, { Arg } from "@fluffy-spoon/substitute";

import { EncString } from "jslib-common/models/domain/encString";

function newGuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function GetUniqueString(prefix = "") {
  return prefix + "_" + newGuid();
}

export function BuildTestObject<T, K extends keyof T = keyof T>(
  def: Partial<Pick<T, K>> | T,
  constructor?: new () => T
): T {
  return Object.assign(constructor === null ? {} : new constructor(), def) as T;
}

export function mockEnc(s: string): EncString {
  const mock = Substitute.for<EncString>();
  mock.decrypt(Arg.any(), Arg.any()).resolves(s);

  return mock;
}

export function makeStaticByteArray(length: number) {
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = i;
  }
  return arr;
}
