class HeapStash {
	// dynamodbTableName
	constructor(settings = {}) {
		this.settings = settings;
		this._ = {
			"internalcache": []
		};
	}

	get(id) {
		if (!id) {
			throw new Error("ID required to get item from cache.");
		}
		return this._.internalcache.find((item) => item.id === id);
	}
	put(id, item) {
		if (!id) {
			throw new Error("ID required to put item in cache.");
		}
		if (!item) {
			throw new Error("Item required to put item in cache.");
		}

		item = {...item, id};
		this._.internalcache.push(item);
		// if (this.settings.ttl) {
		//
		// }

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
