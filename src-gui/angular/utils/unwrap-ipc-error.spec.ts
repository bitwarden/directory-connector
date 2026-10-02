import { unwrapIpcError } from "./unwrap-ipc-error";

describe("unwrapIpcError", () => {
  it("strips the IPC prefix and the nested Error: prefix down to the bare message", () => {
    const error = new Error(
      "Error invoking remote method 'sync:run': Error: Directory configuration incomplete.",
    );

    expect(unwrapIpcError(error).message).toBe("Directory configuration incomplete.");
  });

  it("leaves a plain Error with no IPC prefix unchanged", () => {
    const error = new Error("Directory configuration incomplete.");

    expect(unwrapIpcError(error).message).toBe("Directory configuration incomplete.");
  });

  it("leaves non-Error values unchanged", () => {
    expect(unwrapIpcError("plain failure")).toBe("plain failure");

    const response = { message: "boom" };
    expect(unwrapIpcError(response)).toBe(response);
  });

  it("preserves extra properties like captchaRequired on the mutated Error", () => {
    const error: any = new Error(
      "Error invoking remote method 'accounts:login': Error: Captcha required.",
    );
    error.captchaRequired = true;

    const result = unwrapIpcError(error);

    expect(result.message).toBe("Captcha required.");
    expect(result.captchaRequired).toBe(true);
  });
});
