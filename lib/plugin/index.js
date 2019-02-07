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

	// async get(id) {
	// 	if (!id) {
	// 		throw new Error("ID required to get item from cache.");
	// 	}
	//
	// 	if (this.settings.idPrefix) {
	// 		id = `${this.settings.idPrefix}${id}`;
	// 	}
	//
	// 	const item = this._.internalcache[id];
	// 	if (item) {
	// 		if (typeof item.ttl === "number") {
	// 			if (item.ttl > Date.now()) {
	// 				return item.data;
	// 			}
	// 		} else {
	// 			return item.data;
	// 		}
	// 	}
	// }
	// async put(id, item) {
	// 	if (!id) {
	// 		throw new Error("ID required to put item in cache.");
	// 	}
	// 	if (item === undefined || item === null) {
	// 		throw new Error("Item required to put item in cache.");
	// 	}
	//
	// 	if (this.settings.idPrefix) {
	// 		id = `${this.settings.idPrefix}${id}`;
	// 	}
	//
	// 	while (this.settings.maxItems && this._.internalcachearray.length >= this.settings.maxItems) {
	// 		const removeID = this._.internalcachearray.shift();
	// 		this.remove(removeID);
	// 	}
	//
	// 	const storedObject = {"data": item};
	// 	if (this.settings.ttl) {
	// 		storedObject.ttl = Date.now() + this.settings.ttl;
	// 	}
	// 	this._.internalcache[id] = storedObject;
	// 	this._.internalcachearray.push(id);
	// }
	// async remove(id) {
	// 	if (!id) {
	// 		throw new Error("ID required to delete item from cache.");
	// 	}
	//
	// 	if (this._.internalcache[id]) {
	// 		const internalcachearrayIndex = this._.internalcachearray.findIndex((item) => item === id);
	// 		if (internalcachearrayIndex >= 0) {
	// 			this._.internalcachearray.splice(internalcachearrayIndex, 1);
	// 		}
	//
	// 		delete this._.internalcache[id];
	// 	}
	// }
}

module.exports = Plugin;

fs.readdirSync(path.join(__dirname)).forEach((file) => {
	file = file.split(".")[0];

	if (file === "index" || file[0] === "_") {
		return;
	}

	module.exports[file] = require(path.join(__dirname, file));
});
