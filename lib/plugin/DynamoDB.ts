import debug from "debug";
const primaryDebugGet = debug("HeapStash:Plugin:DynamoDB:Get");
const primaryDebugPut = debug("HeapStash:Plugin:DynamoDB:Put");

const AWS = require("aws-sdk");
import Plugin from "./index";

function awsWrapper (func) {
	if (func.promise) {
		return func.promise();
	} else {
		return func;
	}
}
export = (settings) => {
	const plugin = new Plugin();
	plugin._ = {...settings};

	plugin._.primaryKey = plugin._.primaryKey || "id";
	plugin._.ttlAttribute = plugin._.ttlAttribute || "ttl";
	plugin._.dynamodb = plugin._.dynamodb || new AWS.DynamoDB();

	plugin.tasks.get = async (id: string) => {
		const getItemRequest = {
			"Key": {
				[plugin._.primaryKey]: {
					"S": id
				}
			},
			"TableName": plugin._.tableName
		};
		primaryDebugGet("getItem request: %o", getItemRequest);
		const result = await awsWrapper(plugin._.dynamodb.getItem(getItemRequest));
		primaryDebugGet("getItem result: %o", result);
		const item = AWS.DynamoDB.Converter.unmarshall(result.Item);
		primaryDebugGet("unmarshall: %o", item);
		if (item[plugin._.ttlAttribute]) {
			item.ttl = item[plugin._.ttlAttribute] * 1000;
		}
		if (plugin._.ttlAttribute !== "ttl") {
			delete item[plugin._.ttlAttribute];
		}

		if ((item._ || {}).stringified) {
			item.data = JSON.parse(item.data);
		}

		delete item._;

		primaryDebugGet("return item: %o", item);

		return item;
	};
	plugin.tasks.put = async (id: string, data: any) => {
		data = {...data};
		if (data.ttl) {
			data.ttl = Math.round(data.ttl / 1000);
		}
		if (plugin._.ttlAttribute !== "ttl") {
			data[plugin._.ttlAttribute] = data.ttl;
			delete data.ttl;
		}

		try {
			const dynamoObject = AWS.DynamoDB.Converter.marshall({
				...data,
				[plugin._.primaryKey]: id
			});
			primaryDebugPut("marshalled object: %o", dynamoObject);
			const putItemRequest = {
				"Item": dynamoObject,
				"TableName": plugin._.tableName
			};
			primaryDebugPut("putItem request: %o", putItemRequest);
			await awsWrapper(plugin._.dynamodb.putItem(putItemRequest));
		} catch (e) {
			if (e.code === "ValidationException") {
				const dynamoPreObject = {
					"data": JSON.stringify(data.data),
					"_": {
						"stringified": true
					},
					[plugin._.primaryKey]: id
				};
				if (data[plugin._.ttlAttribute]) {
					dynamoPreObject[plugin._.ttlAttribute] = data[plugin._.ttlAttribute];
				}
				const dynamoObject = AWS.DynamoDB.Converter.marshall(dynamoPreObject);
				await awsWrapper(plugin._.dynamodb.putItem({
					"Item": dynamoObject,
					"TableName": plugin._.tableName
				}));
			} else {
				throw e;
			}
		}
	};
	plugin.tasks.remove = (id: string) => {
		return awsWrapper(plugin._.dynamodb.deleteItem({
			"Key": {
				[plugin._.primaryKey]: {
					"S": id
				}
			},
			"TableName": plugin._.tableName
		}));
	};
	plugin.tasks.clear = async () => {
		let items = [], lastEvaluatedKey;
		do {
			const obj: any = {"TableName": plugin._.tableName};
			if (lastEvaluatedKey) {
				obj.ExclusiveStartKey = lastEvaluatedKey;
			}
			const res = await awsWrapper(plugin._.dynamodb.scan(obj));
			items = [...items, ...res.Items];
			lastEvaluatedKey = res.LastEvaluatedKey;
		} while (lastEvaluatedKey);

		await Promise.all(items.map((item) => item.id).map((id) => awsWrapper(plugin._.dynamodb.deleteItem({"Key": {id}, "TableName": plugin._.tableName}))));
	};

	return plugin;
};
