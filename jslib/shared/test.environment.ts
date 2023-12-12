import JSDOMEnvironment from "jest-environment-jsdom";

/**
 * https://github.com/jsdom/jsdom/issues/3363#issuecomment-1467894943
 * Adds nodes structuredClone implementation to the global object of jsdom.
 * use by either adding this file to the testEnvironment property of jest config
 * or by adding the following to the top spec file:
 *
 * ```
 * /**
 *  * @jest-environment ../shared/test.environment.ts
 *  *\/
 * ```
 */
export default class FixJSDOMEnvironment extends JSDOMEnvironment {
  constructor(...args: ConstructorParameters<typeof JSDOMEnvironment>) {
    super(...args);

    // FIXME https://github.com/jsdom/jsdom/issues/3363
    this.global.structuredClone = structuredClone;
  }
}
