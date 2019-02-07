// TODO:

// - Add support for DynamoDB plugin
// - Set it up so the fetch function will only call the plugins 1 time
// - Add debug log support
// - Add support for overwriting TTL for specific item

class HeapStash {
	// dynamodbTableName
	constructor(settings = {}) {
		this.settings = settings;
		this.plugins = [];

		const refreshinternalcache = () => {
			Object.keys(this._.internalcache).forEach((key) => {
				const item = this._.internalcache[key];
				if (item.ttl <= Date.now()) {
					delete this._.internalcache[key];
				}
			});
		};
		this._ = {
			"internalcache": {},
			"internalcachearray": [],
			"inprogressfetchpromises": {},
			refreshinternalcache
		};
	}

	async get(id) {
		if (!id) {
			throw new Error("ID required to get item from cache.");
		}

		if (this.settings.idPrefix) {
			id = `${this.settings.idPrefix}${id}`;
		}

		let item = this._.internalcache[id];
		if (!item) {
			for (let i = 0; i < this.plugins.length; i++) {
				const plugin = this.plugins[i];
				try {
					const result = await plugin.run("get")(id);
					item = result;
					break;
				} catch (e) {}
			}
		}
		if (item) {
			if (typeof item.ttl === "number") {
				if (item.ttl > Date.now()) {
					return item.data;
				}
			} else {
				return item.data;
			}
		}
	}
	fetch(id, retrieveFunction) {
		if (!id) {
			throw new Error("ID required to fetch item.");
		}
		if (!retrieveFunction) {
			throw new Error("Retrieve function required to fetch item.");
		}

		return new Promise(async (resolve, reject) => {
			const cacheItem = await this.get(id);
			if (cacheItem) {
				resolve(cacheItem);
			} else if (this._.inprogressfetchpromises[id]) {
				this._.inprogressfetchpromises[id].push({resolve, reject});
			} else {
				this._.inprogressfetchpromises[id] = [];

				let result, inprogressfetchpromises;
				let action = resolve;
				try {
					result = await retrieveFunction(id);
					await this.put(id, result);
					inprogressfetchpromises = this._.inprogressfetchpromises[id].map((item) => item.resolve);
				} catch (e) {
					result = e;
					action = reject;
					inprogressfetchpromises = this._.inprogressfetchpromises[id].map((item) => item.reject);
				}

				inprogressfetchpromises.forEach((action) => action(result));
				delete this._.inprogressfetchpromises[id];

				action(result);
			}
		});
	}
	async put(id, item) {
		if (!id) {
			throw new Error("ID required to put item in cache.");
		}
		if (item === undefined || item === null) {
			throw new Error("Item required to put item in cache.");
		}

		if (this.settings.idPrefix) {
			id = `${this.settings.idPrefix}${id}`;
		}

		while (this.settings.maxItems && this._.internalcachearray.length >= this.settings.maxItems) {
			const removeID = this._.internalcachearray.shift();
			this.remove(removeID);
		}

		const storedObject = {"data": item};
		if (this.settings.ttl) {
			storedObject.ttl = Date.now() + this.settings.ttl;
		}
		this._.internalcache[id] = storedObject;
		this._.internalcachearray.push(id);

		await Promise.all(this.plugins.map((plugin) => plugin.run("put")(id, item)));
	}
	async remove(id) {
		if (!id) {
			throw new Error("ID required to delete item from cache.");
		}

		if (this._.internalcache[id]) {
			const internalcachearrayIndex = this._.internalcachearray.findIndex((item) => item === id);
			if (internalcachearrayIndex >= 0) {
				this._.internalcachearray.splice(internalcachearrayIndex, 1);
			}

			delete this._.internalcache[id];
		}

		await Promise.all(this.plugins.map((plugin) => plugin.run("remove")(id)));
	}
}


// var params = {
// 	Item: {
// 		"id": {
// 			S: id
// 		},
// 	},
// 	ReturnConsumedCapacity: "TOTAL",
// 	TableName: "Music"
// };
// dynamodb.putItem(params, function(err, data) {
// });


module.exports = HeapStash;
module.exports.Plugin = require("./plugin");
