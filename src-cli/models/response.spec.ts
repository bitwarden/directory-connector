import { Response } from "./response";

describe("Response.error", () => {
  it("uses the message for a plain Error", () => {
    expect(Response.error(new Error("boom")).message).toBe("boom");
  });

  it("appends the cause when an Error carries one", () => {
    // A fetch failure wraps the underlying TLS/network error in `cause`; without surfacing it,
    // the CLI just reports "fetch failed" with no indication of why, even in debug mode.
    const error = Object.assign(new Error("fetch failed"), {
      cause: new Error("self-signed certificate"),
    });

    expect(Response.error(error).message).toBe("fetch failed (Error: self-signed certificate)");
  });

  it("passes a string through unchanged", () => {
    expect(Response.error("Client ID is required.").message).toBe("Client ID is required.");
  });
});
