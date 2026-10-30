import autoprefixer from "autoprefixer";
import postcssImport from "postcss-import";
import postcssNested from "postcss-nested";
import tailwindcss from "tailwindcss";

export default {
  plugins: [postcssImport, postcssNested, tailwindcss, autoprefixer],
};
