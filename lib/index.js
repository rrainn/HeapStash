const debug = require("debug")("HeapStash");
debug.get = require("debug")("HeapStash:get");
debug.fetch = require("debug")("HeapStash:fetch");
debug.put = require("debug")("HeapStash:put");
debug.remove = require("debug")("HeapStash:remove");
debug.clear = require("debug")("HeapStash:clear");

class HeapStash {
	constructor(settings = {}) {
		debug(`Creating cache instance with settings: ${JSON.stringify(settings)}`);
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

	async get(id, settings = {}) {
		debug.get(`Getting item with ID: ${id}`);
		if (!id) {
			throw new Error("ID required to get item from cache.");
		}

		if (this.settings.idPrefix) {
			id = `${this.settings.idPrefix}${id}`;
			debug.get(`Changing ID to include idPrefix. New ID: ${id}`);
		}

		let item = this._.internalcache[id];
		debug.get(`Item in internal cache: ${item}`);
		if (!item && !settings.internalCacheOnly) {
			debug.get("Item not in internal cache, running plugins.");
			for (let i = 0; i < this.plugins.length; i++) {
				const plugin = this.plugins[i];
				try {
					const result = await plugin.run("get")(id);
					debug.get(`Found item using cache plugins: ${result}`);
					item = result;
					break;
				} catch (e) {}
			}
			debug.get("Done running plugins.");
		}
		if (item) {
			debug.get(`Got item: ${JSON.stringify(item)}`);
			if (typeof item.ttl === "number") {
				if (item.ttl > Date.now()) {
					debug.get(`Returning item: ${item.data}`);
					return item.data;
				} else {
					debug.get("TTL in past, item expired. Not returning anything.");
				}
			} else {
				debug.get(`Returning item: ${item.data}`);
				return item.data;
			}
		}
	}
	fetch(id, settings, retrieveFunction) {
		debug.fetch(`Fetching item with ID: ${id}`);
		if (!id) {
			throw new Error("ID required to fetch item.");
		}

		if (typeof settings === "function") {
			retrieveFunction = settings;
			settings = {};
		}

		let internalID = id;
		if (this.settings.idPrefix) {
			internalID = `${this.settings.idPrefix}${id}`;
			debug.fetch(`Changing ID to include idPrefix. New ID: ${internalID}`);
		}

		if (!retrieveFunction) {
			throw new Error("Retrieve function required to fetch item.");
		}

		return new Promise(async (resolve, reject) => {
			const cacheItem = await this.get(id, {"internalCacheOnly": true});
			if (cacheItem) {
				debug.fetch(`Resolving with cached item: ${cacheItem}`);
				resolve(cacheItem);
			} else if (this._.inprogressfetchpromises[internalID]) {
				debug.fetch("Fetch in progress, adding to queue to resolve when complete.");
				this._.inprogressfetchpromises[internalID].push({resolve, reject});
			} else {
				debug.fetch("Fetch not in progress, running retrieveFunction.");

				this._.inprogressfetchpromises[internalID] = [];

				let result, inprogressfetchpromises;
				let action = resolve;
				try {
					if (!settings.internalCacheOnly) {
						debug.fetch("Running get plugin with plugins");
						try {
							result = await this.get(id);
						} catch (e) {}
					}
					if (!result) {
						debug.fetch("Running retrieve function");
						result = await retrieveFunction(id);
						debug.fetch("Done running retrieve function");
					}
					debug.fetch(`Got result from retrieveFunction: ${result}`);
					await this.put(id, result, settings);
					inprogressfetchpromises = this._.inprogressfetchpromises[internalID].map((item) => item.resolve);
				} catch (e) {
					debug.fetch(`Got error from retrieveFunction: ${e}`);
					result = e;
					action = reject;
					inprogressfetchpromises = this._.inprogressfetchpromises[internalID].map((item) => item.reject);
				}

				debug.fetch(`Resolving all ${inprogressfetchpromises.length} pending promises.`);

				inprogressfetchpromises.forEach((action) => action(result));
				delete this._.inprogressfetchpromises[internalID];

				debug.fetch("Resolving original promise.");

				action(result);
			}
		});
	}
	async put(id, item, settings = {}) {
		debug.put(`Putting item: ${item} with ID: ${id}`);
		if (!id) {
			throw new Error("ID required to put item in cache.");
		}
		if (item === undefined || item === null) {
			throw new Error("Item required to put item in cache.");
		}

		if (this.settings.idPrefix) {
			id = `${this.settings.idPrefix}${id}`;
			debug.put(`Changing ID to include idPrefix. New ID: ${id}`);
		}

		while (this.settings.maxItems && this._.internalcachearray.length >= this.settings.maxItems) {
			debug.put("Too many items, removing item.");
			const removeID = this._.internalcachearray.shift();
			await this.remove(removeID, {"internalCacheOnly": true});
			debug.put(`Removed item: ${removeID}`);
		}

		const storedObject = {"data": item};
		if ((settings.ttl || this.settings.ttl) && (settings.ttl !== false)) {
			storedObject.ttl = Date.now() + (settings.ttl || this.settings.ttl);
			debug.put(`Adding TTL: ${storedObject.ttl}`);
		}
		debug.put(`Storing item in cache: ${JSON.stringify(storedObject)}`);
		this._.internalcache[id] = storedObject;
		this._.internalcachearray.push(id);

		if (!settings.internalCacheOnly) {
			debug.put(`Storing item in plugins: ${JSON.stringify(storedObject)}`);
			await Promise.all(this.plugins.map((plugin) => plugin.run("put")(id, storedObject)));
			debug.put("Done storing item in plugins.");
		} else {
			debug.put("Not storing item from plugins since internalCacheOnly is set to false.");
		}
	}
	async remove(id, settings = {}) {
		debug.remove(`Removing item with ID: ${id}`);
		if (!id) {
			throw new Error("ID required to delete item from cache.");
		}

		if (this._.internalcache[id]) {
			const internalcachearrayIndex = this._.internalcachearray.findIndex((item) => item === id);
			if (internalcachearrayIndex >= 0) {
				debug.remove(`Found item to remove in internalcachearray at index: ${internalcachearrayIndex}`);
				this._.internalcachearray.splice(internalcachearrayIndex, 1);
			}

			delete this._.internalcache[id];
		}

		if (!settings.internalCacheOnly) {
			debug.remove(`Removing item from plugins with ID: ${id}`);
			await Promise.all(this.plugins.map((plugin) => plugin.run("remove")(id)));
			debug.remove("Done removing item in plugins.");
		} else {
			debug.remove("Not removing item from plugins since internalCacheOnly is set to false.");
		}
	}
	async clear(settings = {}) {
		debug.clear("Clearing cache");

		this._.internalcache = {};
		this._.internalcachearray = [];

		if (!settings.internalCacheOnly) {
			debug.clear("Clearing cache from plugins");
			await Promise.all(this.plugins.map((plugin) => plugin.run("clear")()));
			debug.clear("Done clearing cache in plugins.");
		} else {
			debug.clear("Not clearing cache from plugins since internalCacheOnly is set to false.");
		}
	}
}

module.exports = HeapStash;
module.exports.Plugin = require("./plugin");
