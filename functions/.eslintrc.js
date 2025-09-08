module.exports = {
    root: true,
    env: {
        es6: true,
        node: true,
    },
    extends: [
        "eslint:recommended",
    ],
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: "module",
    },
    ignorePatterns: [
        "/lib/**/*",
        "/node_modules/**/*"
    ],
    rules: {
        "no-restricted-globals": ["error", "name", "length"],
        "prefer-arrow-callback": "error",
        "@typescript-eslint/no-explicit-any": "off",
        "quotes": ["error", "double", { "allowTemplateLiterals": true }],
    },
};
