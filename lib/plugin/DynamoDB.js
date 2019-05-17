const AWS = require("aws-sdk");
const Plugin = require("./");

module.exports = (settings) => {
	const plugin = new Plugin();
	plugin._ = {...settings};

	plugin._.primaryKey = plugin._.primaryKey || "id";
	plugin._.ttlAttribute = plugin._.ttlAttribute || "ttl";
	plugin._.dynamodb = plugin._.dynamodb || new AWS.DynamoDB();

	plugin.tasks.get = async (id) => {
		const result = await plugin._.dynamodb.getItem({
			"Key": {
				[plugin._.primaryKey]: {
					"S": id
				}
			},
			"TableName": plugin._.tableName
		}).promise();
		const item = AWS.DynamoDB.Converter.unmarshall(result.Item);
		if (item[plugin._.ttlAttribute]) {
			item.ttl = item[plugin._.ttlAttribute] * 1000;
		}
		if (plugin._.ttlAttribute !== "ttl") {
			delete item[plugin._.ttlAttribute];
		}

		return item;
	};
	plugin.tasks.put = (id, data) => {
		data = {...data};
		if (data.ttl) {
			data.ttl = Math.round(data.ttl / 1000);
		}
		if (plugin._.ttlAttribute !== "ttl") {
			data[plugin._.ttlAttribute] = data.ttl;
			delete data.ttl;
		}

		const dynamoObject = AWS.DynamoDB.Converter.marshall({
			...data,
			[plugin._.primaryKey]: id
		});
		return plugin._.dynamodb.putItem({
			"Item": dynamoObject,
			"TableName": plugin._.tableName
		}).promise();
	};
	plugin.tasks.remove = (id) => {
		return plugin._.dynamodb.deleteItem({
			"Key": {
				[plugin._.primaryKey]: {
					"S": id
				}
			},
			"TableName": plugin._.tableName
		}).promise();
	};
	plugin.tasks.clear = async () => {
		let items = [], lastEvaluatedKey;
		do {
			const obj = {"TableName": plugin._.tableName};
			if (lastEvaluatedKey) {
				obj.ExclusiveStartKey = lastEvaluatedKey;
			}
			const res = await plugin._.dynamodb.scan(obj).promise();
			items = [...items, ...res.Items];
			lastEvaluatedKey = res.LastEvaluatedKey;
		} while (lastEvaluatedKey);

		await Promise.all(items.map((item) => item.id).map((id) => plugin._.dynamodb.deleteItem({"Key": {id}, "TableName": plugin._.tableName}).promise()));
	};

	return plugin;
};
