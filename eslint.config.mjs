import { fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import _import from "eslint-plugin-import";
import jsdoc from "eslint-plugin-jsdoc";
import preferArrow from "eslint-plugin-prefer-arrow";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: [
        "src/definitions/schema.d.ts",
        "build/*",
        "node_modules/*",
        "db/migrations/*",
        "**/__test__/*",
    ],
}, ...compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"), {
    plugins: {
        import: fixupPluginRules(_import),
        jsdoc,
        "prefer-arrow": preferArrow,
        unicorn,
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        globals: {
            ...globals.node,
            ...globals.jest,
        },

        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "module",

        parserOptions: {
            project: "tsconfig.json",
        },
    },

    settings: {
        "import/internal-regex": "^(common|connectors|definitions|middlewares|mutations|queries|routes|types)",
    },

    rules: {
        "@typescript-eslint/ban-ts-comment": "warn",
        "no-case-declarations": "warn",

        "@typescript-eslint/array-type": ["error", {
            default: "array-simple",
        }],

        "@typescript-eslint/dot-notation": ["error", {
            allowPattern: "^[A-Z_]+$",
        }],

        "@typescript-eslint/explicit-member-accessibility": ["warn", {
            accessibility: "explicit",
        }],

        "@typescript-eslint/naming-convention": ["error", {
            selector: "variable",
            format: ["camelCase", "snake_case", "PascalCase", "UPPER_CASE"],
            leadingUnderscore: "allow",
            trailingUnderscore: "forbid",
        }],

        "@typescript-eslint/no-shadow": ["error", {
            hoist: "all",
        }],

        "@typescript-eslint/semi": ["off", null],
        eqeqeq: ["error", "smart"],

        "import/order": ["error", {
            alphabetize: {
                caseInsensitive: true,
                order: "asc",
            },

            "newlines-between": "always",

	    // TODO: fix subpath imports ordering when got support, see https://github.com/import-js/eslint-plugin-import/issues/2679
            groups: [
                "type",
                ["builtin", "external", "unknown"],
                "internal",
                "parent",
                ["sibling", "index"],
                "object",
            ],

            distinctGroup: false,
            pathGroupsExcludedImportTypes: [],

            pathGroups: [{
                pattern: "./",

                patternOptions: {
                    nocomment: true,
                    dot: true,
                },

                group: "sibling",
                position: "before",
            }, {
                pattern: ".",

                patternOptions: {
                    nocomment: true,
                    dot: true,
                },

                group: "sibling",
                position: "before",
            }, {
                pattern: "..",

                patternOptions: {
                    nocomment: true,
                    dot: true,
                },

                group: "parent",
                position: "before",
            }, {
                pattern: "../",

                patternOptions: {
                    nocomment: true,
                    dot: true,
                },

                group: "parent",
                position: "before",
            }],
        }],

        semi: "off",

        "spaced-comment": ["error", "always", {
            markers: ["/"],

            block: {
                exceptions: ["*"],
            },
        }],
    },
}, {
    files: ["db/migrations/*.js"],

    rules: {
        "prefer-arrow/prefer-arrow-functions": "off",
    },
}];
