export default {
  "*": "prettier --cache --ignore-unknown --write",
  "*.ts": "eslint --cache --cache-strategy content --fix",
};
