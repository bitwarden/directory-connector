import { ErrorResponse } from "@/libs/models/response/errorResponse";
import { Utils } from "@/libs/utils/utils";

/**
 * Serializes a rejection into a message the renderer can act on.
 *
 * Electron only transfers an Error's `message` across `ipcRenderer.invoke`, so anything that is
 * not an Error — notably {@link ErrorResponse}, which extends BaseResponse — has to be flattened
 * by hand. Naively using `String(e)` yields "[object Object]", and `e.message` alone is often
 * undefined (a 4xx with no Message field, or one that only carries ValidationErrors), which
 * loses the failure entirely. Prefer, in order: the validation errors, the top-level message,
 * then the status code, so the renderer always receives something actionable.
 */
export function describeError(e: unknown): string {
  if (e instanceof Error) {
    return e.message;
  }

  if (e != null && typeof e === "object") {
    const response = e as Partial<ErrorResponse>;

    if (typeof (response as ErrorResponse).getAllMessages === "function") {
      const messages = (response as ErrorResponse).getAllMessages();
      if (messages.length > 0) {
        return messages.join(" ");
      }
    }

    if (!Utils.isNullOrWhitespace(response.message)) {
      return response.message;
    }

    // No usable message. Fall back to the status plus whatever the server actually returned —
    // an OAuth-style body such as {"error":"invalid_client"} carries no Message field, so
    // without this a bad API key reports nothing at all.
    let body: string = null;
    try {
      const serialized = JSON.stringify(e);
      if (serialized != null && serialized !== "{}") {
        body = serialized;
      }
    } catch {
      // Value cannot be serialized; fall back to the status alone.
    }

    if (response.statusCode != null) {
      return body != null
        ? `Request failed with status ${response.statusCode}: ${body}`
        : `Request failed with status ${response.statusCode}.`;
    }

    if (body != null) {
      return body;
    }
  }

  return String(e);
}
