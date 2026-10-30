/** The subset of `@bitwarden/common` Utils used by the vendored component library. */
export class Utils {
  static isMobileBrowser = false;

  static isPromise(obj: unknown): obj is Promise<unknown> {
    return (
      obj != undefined &&
      typeof (obj as Promise<unknown>).then === "function" &&
      typeof (obj as Promise<unknown>).catch === "function"
    );
  }

  static pickTextColorBasedOnBgColor(bgColor: string, threshold = 186, svgTextFill = false) {
    const bgColorHexNums = bgColor.charAt(0) === "#" ? bgColor.substring(1, 7) : bgColor;
    const r = parseInt(bgColorHexNums.substring(0, 2), 16);
    const g = parseInt(bgColorHexNums.substring(2, 4), 16);
    const b = parseInt(bgColorHexNums.substring(4, 6), 16);
    const blackColor = svgTextFill ? "black" : "black !important";
    const whiteColor = svgTextFill ? "white" : "white !important";
    return r * 0.299 + g * 0.587 + b * 0.114 > threshold ? blackColor : whiteColor;
  }
}
