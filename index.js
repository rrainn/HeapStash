class HeapStash {
	// dynamodbTableName
	constructor(settings = {}) {
		this.settings = settings;

		const refreshinternalcache = () => {
			let removeIndexes = [];
			const removeElements = () => {
				removeIndexes.reverse();
				removeIndexes.forEach((i) => this._.internalcache.splice(i, 1));
			}

			for (let i = 0; i < this._.internalcache.length; i++) {
				if (this._.internalcache[i].ttl <= Date.now()) {
					removeIndexes.push(i);
				} else {
					removeElements();
					return;
				}
			}
			removeElements();
		};
		this._ = {
			"internalcache": [],
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

		const item = this._.internalcache.find((item) => item.id === id);
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

		item = {...item, id};
		if (this.settings.ttl) {
			item.ttl = Date.now() + this.settings.ttl;
		}
		const existingIndex = this._.internalcache.findIndex((item) => item.id === id);
		if (existingIndex === -1) {
			this._.internalcache.push(item);
		} else {
			this._.internalcache[existingIndex] = item;
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
	}
}

module.exports = HeapStash;
