// TODO:

// - Fix issue with storing strings, numbers, booleans, etc
// - Add max items internal cache setting
// - Add support for secendary cache layer support (DynamoDB plugin)

class HeapStash {
	// dynamodbTableName
	constructor(settings = {}) {
		this.settings = settings;

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
			"inprogressfetchpromises": {},
			refreshinternalcache
		};
	}

	get(id) {
		if (!id) {
			throw new Error("ID required to get item from cache.");
		}

		if (this.settings.idPrefix) {
			id = `${this.settings.idPrefix}${id}`;
		}

		const item = this._.internalcache[id];
		if (item) {
			if (typeof item.ttl === "number") {
				if (item.ttl > Date.now()) {
					return item;
				}
			} else {
				return item;
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
			const cacheItem = this.get(id);
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
					this.put(id, result);
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
	put(id, item) {
		if (!id) {
			throw new Error("ID required to put item in cache.");
		}
		if (!item) {
			throw new Error("Item required to put item in cache.");
		}

		if (this.settings.idPrefix) {
			id = `${this.settings.idPrefix}${id}`;
		}

		item = {...item};
		if (this.settings.ttl) {
			item.ttl = Date.now() + this.settings.ttl;
		}
		this._.internalcache[id] = item;

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
	}
}

module.exports = HeapStash;
