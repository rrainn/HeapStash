module.exports = {
	"setupFilesAfterEnv": [
		"./testutils/extenders.js"
	],
	"watchPathIgnorePatterns": ["globalConfig"],
	"preset": "@shelf/jest-mongodb"
};
