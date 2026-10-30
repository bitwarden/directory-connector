import { ErrorResponse } from "@/libs/models/response/errorResponse";

import { describeError } from "./describe-error";

/**
 * Electron only transfers an Error's `message` across `ipcRenderer.invoke`. ErrorResponse extends
 * BaseResponse rather than Error, so without deliberate flattening a failed login reached the
 * renderer as "[object Object]" and the real cause was lost.
 */
describe("describeError", () => {
  it("passes an Error's message through unchanged", () => {
    expect(describeError(new Error("boom"))).toBe("boom");
  });

  it("reports the status and body for an OAuth error with no Message field", () => {
    // The shape returned for a bad API key — the case that produced "[object Object]".
    const error = new ErrorResponse({ error: "invalid_client" }, 400, true);

    const result = describeError(error);

    expect(result).not.toBe("[object Object]");
    expect(result).toContain("400");
    expect(result).toContain("invalid_client");
  });

  it("prefers validation errors when present", () => {
    const error = new ErrorResponse(
      { ValidationErrors: { "": ["Username or password is incorrect."] } },
      400,
      true,
    );

    expect(describeError(error)).toBe("Username or password is incorrect.");
  });

  it("uses the identity ErrorModel message", () => {
    const error = new ErrorResponse(
      { ErrorModel: { Message: "Invalid client secret." } },
      400,
      true,
    );

    expect(describeError(error)).toBe("Invalid client secret.");
  });

  it("uses the rate limit message", () => {
    const error = new ErrorResponse(null, 429, true);

    expect(describeError(error)).toBe("Rate limit exceeded. Try again later.");
  });

  it("includes the status when only a status is available", () => {
    const result = describeError({ statusCode: 503 });

    expect(result).toContain("503");
  });

  it("falls back to the status alone when the body cannot be serialized", () => {
    const circular: any = { statusCode: 503 };
    circular.self = circular;

    expect(describeError(circular)).toBe("Request failed with status 503.");
  });

  it("serializes a plain object that carries no message or status", () => {
    expect(describeError({ error: "unsupported_grant_type" })).toContain("unsupported_grant_type");
  });

  it("handles values that cannot be serialized", () => {
    const circular: any = {};
    circular.self = circular;

    expect(() => describeError(circular)).not.toThrow();
  });

  it("handles null and undefined", () => {
    expect(describeError(null)).toBe("null");
    expect(describeError(undefined)).toBe("undefined");
  });

  it("passes a string through", () => {
    expect(describeError("plain failure")).toBe("plain failure");
  });
});
