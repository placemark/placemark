module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  ignorePatterns: ["workers", "vendor", "docs"],
  settings: {
    react: {
      version: "detect",
    },
  },
  // extends: [
  //   "blitz",
  //   "eslint:recommended",
  //   "plugin:react/recommended",
  //   "plugin:@typescript-eslint/recommended",
  // ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: "module",
  },
  plugins: ["react", "react-hooks", "@typescript-eslint", "unused-imports"],
  rules: {
    "react/react-in-jsx-scope": 0,
    "react/display-name": 0,
    "jsx-a11y/no-onchange": 0,
    "jsx-a11y/no-autofocus": 0,
    "no-console": ["error"],
    "no-warning-comments": ["error", { terms: ["fixme"] }],
    "no-restricted-imports": [
      "error",
      { paths: ["lodash", "purify-ts", "proj4"] },
    ],
    "no-throw-literal": "error",
    "prefer-const": 1,
    "require-await": 1,
    "react/jsx-key": 2,
    "react/prop-types": 0,
    "react/no-unescaped-entities": 0,
    "@next/next/no-img-element": 0,
    "@typescript-eslint/no-non-null-assertion": 0,
    "@typescript-eslint/explicit-module-boundary-types": 0,
    "@typescript-eslint/ban-types": 1,
    "react/jsx-no-useless-fragment": 2,
    "@typescript-eslint/no-explicit-any": 0,
    "@typescript-eslint/no-empty-function": 0,
    "react-hooks/rules-of-hooks": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", ignoreRestSiblings: true },
    ],
    "react-hooks/exhaustive-deps": [
      "warn",
      {
        additionalHooks: "(useRecoilCallback|useRecoilTransaction_UNSTABLE)",
      },
    ],
  },
  overrides: [
    {
      files: ["*.ts", "*.tsx"], // Your TypeScript files extension
      parserOptions: {
        project: ["./tsconfig.json"], // Specify it only for TypeScript files
      },
      extends: [
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
      ],
      rules: {
        "prefer-const": 1,
        "unused-imports/no-unused-imports": "error",
        "@typescript-eslint/no-explicit-any": 0,
        "@typescript-eslint/no-base-to-string": 0,
        "@typescript-eslint/no-floating-promises": 1,
        "@typescript-eslint/switch-exhaustiveness-check": 2,
        "@typescript-eslint/no-misused-promises": 0,
        "@typescript-eslint/no-unnecessary-type-assertion": 1,
        "@typescript-eslint/no-unsafe-return": 1,
        // This will trip an error in linting/CI
        // because Routes will not be generated.
        "@typescript-eslint/no-unsafe-call": 1,
        "@typescript-eslint/no-unsafe-assignment": 0,
        "@typescript-eslint/no-unsafe-argument": 0,
        "@typescript-eslint/no-unsafe-member-access": 0,
        "@typescript-eslint/unbound-method": 0,
      },
    },
    {
      files: ["./*.config.js", ".eslintrc.js"],
      env: {
        commonjs: true,
      },
    },
    {
      files: ["./vendor/*/*"],
      rules: {
        complexity: 0,
        "no-warning-comments": 0,
      },
    },
    {
      files: ["./vendor/mapshaper/**/*", "./vendor/mproj.js"],
      rules: {
        "@typescript-eslint/no-loss-of-precision": 0,
        "no-console": 0,
        "@typescript-eslint/no-unused-vars": 0,
        "@typescript-eslint/no-var-requires": 0,
        "@typescript-eslint/no-this-alias": 0,
        "no-extra-boolean-cast": 0,
        "no-useless-escape": 0,
        "no-empty": 0,
        "no-warning-comments": 0,
        "no-undef": 0,
        "no-constant-condition": 0,
        "no-control-regex": 0,
        "no-prototype-builtins": 0,
        "react-hooks/rules-of-hooks": 0,
      },
    },
  ],
};
