import debug from "debug";

const primaryDebug = debug("HeapStash");
const primaryDebugGet = debug("HeapStash:get");
const primaryDebugFetch = debug("HeapStash:fetch");
const primaryDebugPut = debug("HeapStash:put");
const primaryDebugRemove = debug("HeapStash:remove");
const primaryDebugClear = debug("HeapStash:clear");

interface HeapStashSettings {
	idPrefix?: string;
	maxItems?: number;
	ttl?: number;
}

interface ActionSettings {
	internalCacheOnly?: boolean;
}

type GetSettings = ActionSettings;
interface PutSettings extends ActionSettings {
	ttl?: number | false;
}
type FetchSettings = ActionSettings;
type RemoveSettings = ActionSettings;
type ClearSettings = ActionSettings;

class HeapStash {
	settings: HeapStashSettings;
	plugins: any[];
	_: any;

	constructor (settings: HeapStashSettings = {}) {
		primaryDebug(`Creating cache instance with settings: ${JSON.stringify(settings)}`);
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

	async get (id: string, settings: GetSettings = {}) {
		primaryDebugGet(`Getting item with ID: ${id}`);
		if (!id) {
			throw new Error("ID required to get item from cache.");
		}

		if (this.settings.idPrefix) {
			id = `${this.settings.idPrefix}${id}`;
			primaryDebugGet(`Changing ID to include idPrefix. New ID: ${id}`);
		}

		let item = this._.internalcache[id];
		primaryDebugGet(`Item in internal cache: ${item}`);
		if (!item && !settings.internalCacheOnly) {
			primaryDebugGet("Item not in internal cache, running plugins.");
			for (let i = 0; i < this.plugins.length; i++) {
				const plugin = this.plugins[i];
				try {
					const result = await plugin.run("get")(id);
					primaryDebugGet(`Found item using cache plugins: ${result}`);
					item = result;
					break;
				} catch (e) {}
			}
			primaryDebugGet("Done running plugins.");
		}
		if (item) {
			primaryDebugGet(`Got item: ${JSON.stringify(item)}`);
			if (typeof item.ttl === "number") {
				if (item.ttl > Date.now()) {
					primaryDebugGet(`Returning item: ${item.data}`);
					return item.data;
				} else {
					primaryDebugGet("TTL in past, item expired. Not returning anything.");
				}
			} else {
				primaryDebugGet(`Returning item: ${item.data}`);
				return item.data;
			}
		}
	}
	fetch (id: string, retrieveFunction: (id: string) => Promise<any>);
	fetch (id: string, settings: FetchSettings, retrieveFunction: (id: string) => Promise<any>);
	fetch (id: string, settings: FetchSettings | ((id: string) => Promise<any>), retrieveFunction?: (id: string) => Promise<any>) {
		primaryDebugFetch(`Fetching item with ID: ${id}`);
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
			primaryDebugFetch(`Changing ID to include idPrefix. New ID: ${internalID}`);
		}

		if (!retrieveFunction) {
			throw new Error("Retrieve function required to fetch item.");
		}

		return new Promise(async (resolve, reject) => { // eslint-disable-line no-async-promise-executor
			const cacheItem = await this.get(id, {"internalCacheOnly": true});
			if (cacheItem) {
				primaryDebugFetch(`Resolving with cached item: ${cacheItem}`);
				resolve(cacheItem);
			} else if (this._.inprogressfetchpromises[internalID]) {
				primaryDebugFetch("Fetch in progress, adding to queue to resolve when complete.");
				this._.inprogressfetchpromises[internalID].push({resolve, reject});
			} else {
				primaryDebugFetch("Fetch not in progress, running retrieveFunction.");

				this._.inprogressfetchpromises[internalID] = [];

				let result, inprogressfetchpromises;
				let action = resolve;
				try {
					if (!(settings as FetchSettings).internalCacheOnly) {
						primaryDebugFetch("Running get plugin with plugins");
						try {
							result = await this.get(id);
						} catch (e) {}
					}
					if (!result) {
						primaryDebugFetch("Running retrieve function");
						result = await retrieveFunction(id);
						primaryDebugFetch("Done running retrieve function");
					}
					primaryDebugFetch(`Got result from retrieveFunction: ${result}`);
					await this.put(id, result, settings as any);
					inprogressfetchpromises = this._.inprogressfetchpromises[internalID].map((item) => item.resolve);
				} catch (e) {
					primaryDebugFetch(`Got error from retrieveFunction: ${e}`);
					result = e;
					action = reject;
					inprogressfetchpromises = this._.inprogressfetchpromises[internalID].map((item) => item.reject);
				}

				primaryDebugFetch(`Resolving all ${inprogressfetchpromises.length} pending promises.`);

				inprogressfetchpromises.forEach((action) => action(result));
				delete this._.inprogressfetchpromises[internalID];

				primaryDebugFetch("Resolving original promise.");

				action(result);
			}
		});
	}
	async put (id: string, item: any, settings: PutSettings = {}) {
		primaryDebugPut(`Putting item: ${item} with ID: ${id}`);
		if (!id) {
			throw new Error("ID required to put item in cache.");
		}
		if (item === undefined || item === null) {
			throw new Error("Item required to put item in cache.");
		}

		if (this.settings.idPrefix) {
			id = `${this.settings.idPrefix}${id}`;
			primaryDebugPut(`Changing ID to include idPrefix. New ID: ${id}`);
		}

		while (this.settings.maxItems && this._.internalcachearray.length >= this.settings.maxItems) {
			primaryDebugPut("Too many items, removing item.");
			const removeID = this._.internalcachearray.shift();
			await this.remove(removeID, {"internalCacheOnly": true});
			primaryDebugPut(`Removed item: ${removeID}`);
		}

		const storedObject: any = {"data": item};
		if ((settings.ttl || this.settings.ttl) && settings.ttl !== false) {
			storedObject.ttl = Date.now() + (settings.ttl || this.settings.ttl);
			primaryDebugPut(`Adding TTL: ${storedObject.ttl}`);
		}
		primaryDebugPut(`Storing item in cache: ${JSON.stringify(storedObject)}`);
		this._.internalcache[id] = storedObject;
		this._.internalcachearray.push(id);

		if (!settings.internalCacheOnly) {
			primaryDebugPut(`Storing item in plugins: ${JSON.stringify(storedObject)}`);
			await Promise.all(this.plugins.map((plugin) => plugin.run("put")(id, storedObject)));
			primaryDebugPut("Done storing item in plugins.");
		} else {
			primaryDebugPut("Not storing item from plugins since internalCacheOnly is set to false.");
		}
	}
	async remove (id: string, settings: RemoveSettings = {}) {
		primaryDebugRemove(`Removing item with ID: ${id}`);
		if (!id) {
			throw new Error("ID required to delete item from cache.");
		}

		if (this._.internalcache[id]) {
			const internalcachearrayIndex = this._.internalcachearray.findIndex((item) => item === id);
			if (internalcachearrayIndex >= 0) {
				primaryDebugRemove(`Found item to remove in internalcachearray at index: ${internalcachearrayIndex}`);
				this._.internalcachearray.splice(internalcachearrayIndex, 1);
			}

			delete this._.internalcache[id];
		}

		if (!settings.internalCacheOnly) {
			primaryDebugRemove(`Removing item from plugins with ID: ${id}`);
			await Promise.all(this.plugins.map((plugin) => plugin.run("remove")(id)));
			primaryDebugRemove("Done removing item in plugins.");
		} else {
			primaryDebugRemove("Not removing item from plugins since internalCacheOnly is set to false.");
		}
	}
	async clear (settings: ClearSettings = {}) {
		primaryDebugClear("Clearing cache");

		this._.internalcache = {};
		this._.internalcachearray = [];

		if (!settings.internalCacheOnly) {
			primaryDebugClear("Clearing cache from plugins");
			await Promise.all(this.plugins.map((plugin) => plugin.run("clear")()));
			primaryDebugClear("Done clearing cache in plugins.");
		} else {
			primaryDebugClear("Not clearing cache from plugins since internalCacheOnly is set to false.");
		}
	}
}

import {Plugin} from "./plugin";
export {
	Plugin,
	HeapStash
};
