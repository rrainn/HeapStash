const fs = require("fs");
const path = require("path");

class Plugin {
	constructor() {
		this.tasks = {};
	}

	run(name) {
		const self = this;
		return function() {
			if (self.tasks[name]) {
				return self.tasks[name](...arguments);
			}
		};
	}
}

module.exports = Plugin;

fs.readdirSync(path.join(__dirname)).forEach((file) => {
	file = file.split(".")[0];

	if (file === "index" || file[0] === "_") {
		return;
	}

	module.exports[file] = require(path.join(__dirname, file));
});
