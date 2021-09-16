module.exports = {
	"env": {
		"es6": true,
		"node": true
	},
	"extends": "eslint:recommended",
	"parserOptions": {
		"ecmaVersion": 2018
	},
	"rules": {
		"indent": [
			"error",
			"tab"
		],
		"linebreak-style": [
			"error",
			"unix"
		],
		"quotes": [
			"error",
			"double"
		],
		"semi": [
			"error",
			"always"
		],
		"no-empty": "off"
	},
	"overrides": [
		{
			"files": ["**/*.ts"],
			"parser": "@typescript-eslint/parser",
			"extends": [
				"eslint:recommended",
				"plugin:@typescript-eslint/eslint-recommended",
				"plugin:@typescript-eslint/recommended"
			],
			"plugins": ["@typescript-eslint"],
			"rules": {
				"indent": [
					"error",
					"tab"
				],
				"linebreak-style": [
					"error",
					"unix"
				],
				"quotes": [
					"error",
					"double"
				],
				"prefer-rest-params": "off",
				"no-empty": "off",
				"@typescript-eslint/camelcase": "off",
				"@typescript-eslint/no-this-alias": "off",
				"@typescript-eslint/no-var-requires": "off",
				"@typescript-eslint/no-explicit-any": "off",
				"brace-style": "off",
				"@typescript-eslint/brace-style": "error",
				"comma-spacing": "off",
				"@typescript-eslint/comma-spacing": "error",
				"keyword-spacing": "off",
				"@typescript-eslint/keyword-spacing": "error",
				"no-extra-parens": "off",
				"@typescript-eslint/no-extra-parens": "error",
				"semi": "off",
				"@typescript-eslint/semi": "error",
				"space-before-function-paren": "off",
				"@typescript-eslint/space-before-function-paren": "error",
				"@typescript-eslint/ban-types": "off",
				"@typescript-eslint/explicit-module-boundary-types": "off"
			}
		},
		{
			"files": [
				"__tests__/**",
				"testutils/**"
			],
			"env": {
				"jest": true
			},
		}
	]
};
