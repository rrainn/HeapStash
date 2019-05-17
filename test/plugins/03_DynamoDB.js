const HeapStash = require("../../");
const {expect} = require("chai");
const DynamoDB = HeapStash.Plugin.DynamoDB;
const AWS = require("aws-sdk");
const DynamoDbLocal = require("dynamodb-local");
const DYNAMO_DB_PORT = 8000;

describe("DynamoDB", function() {
	this.timeout(60000);

	let dynamoLocal;
	before(async function() {
		dynamoLocal = await DynamoDbLocal.launch(DYNAMO_DB_PORT);
	});
	after(() => {
		if (dynamoLocal && dynamoLocal.pid) {
			process.kill(dynamoLocal.pid);
		}
	});

	let cache;
	AWS.config.update({
		"accessKeyId": "TESTID",
		"secretAccessKey": "TESTSECRET"
	});
	let dynamodb = new AWS.DynamoDB({
		"endpoint": new AWS.Endpoint(`http://localhost:${DYNAMO_DB_PORT}`),
		"region": "us-west-2"
	});
	beforeEach(() => cache = new HeapStash());
	beforeEach(() => cache.plugins.push(DynamoDB({dynamodb, "tableName": "TestTable"})));
	beforeEach(() => dynamodb.createTable({
		"AttributeDefinitions": [
			{
				"AttributeName": "id",
				"AttributeType": "S"
			}
		],
		"KeySchema": [
			{
				"AttributeName": "id",
				"KeyType": "HASH"
			}
		],
		"ProvisionedThroughput": {
			"ReadCapacityUnits": 5,
			"WriteCapacityUnits": 5
		},
		"TableName": "TestTable"
	}).promise());
	beforeEach(() => dynamodb.waitFor("tableExists", {"TableName": "TestTable"}).promise());
	afterEach(() => dynamodb.deleteTable({"TableName": "TestTable"}).promise());
	afterEach(() => dynamodb.waitFor("tableNotExists", {"TableName": "TestTable"}).promise());

	describe("General", () => {
		it("Should use default DynamoDB instance if not passed in", () => {
			expect(DynamoDB({})._.dynamodb).to.exist;
		});
	});

	describe("get()", () => {
		beforeEach(() => dynamodb.putItem({
			"Item": AWS.DynamoDB.Converter.marshall({"id": "id", "data": {"myitem": "Hello World"}}),
			"TableName": "TestTable"
		}).promise());
		beforeEach(() => dynamodb.putItem({
			"Item": AWS.DynamoDB.Converter.marshall({"id": "id2", "data": "test"}),
			"TableName": "TestTable"
		}).promise());

		it("Should return correct item", async () => {
			const res = await cache.get("id");

			expect(res).to.eql({"myitem": "Hello World"});
		});

		it("Should return undefined for item that does not exist", async () => {
			const res = await cache.get("other");

			expect(res).to.not.exist;
		});

		it("Should return correct item that is not a JSON object", async () => {
			const res = await cache.get("id2");

			expect(res).to.eql("test");
		});

		describe("TTL", () => {
			const properties = ["ttl", "customttlproperty"];

			properties.forEach((prop) => {
				describe(`Property - ${prop}`, () => {
					if (prop !== "ttl") {
						beforeEach(() => cache.plugins = [DynamoDB({dynamodb, "ttlAttribute": prop, "tableName": "TestTable"})]);
					}
					beforeEach(() => dynamodb.putItem({
						"Item": AWS.DynamoDB.Converter.marshall({"id": "id3", [prop]: Date.now() / 1000, "data": "test"}),
						"TableName": "TestTable"
					}).promise());
					beforeEach(() => dynamodb.putItem({
						"Item": AWS.DynamoDB.Converter.marshall({"id": "id4", [prop]: (Date.now() * (1000 * 60)) / 1000, "data": "test"}),
						"TableName": "TestTable"
					}).promise());


					it("Should return correct item for ttl in the past", async () => {
						const res = await cache.get("id3");

						expect(res).to.not.exist;
					});

					it("Should return correct item for ttl in the future", async () => {
						const res = await cache.get("id4");

						expect(res).to.eql("test");
					});

				});
			});
		});
	});

	describe("put()", () => {
		it("Should put item in DynamoDB", async () => {
			await cache.put("id", {"myitem": "Hello World"});

			const dbItem = AWS.DynamoDB.Converter.unmarshall((await dynamodb.getItem({
				"Key": {
					"id": {
						"S": "id"
					}
				},
				"TableName": "TestTable"
			}).promise()).Item);
			delete dbItem.id;

			expect(dbItem).to.eql({"data": {"myitem": "Hello World"}});
		});

		describe("TTL", () => {
			const properties = ["ttl", "customttlproperty"];

			properties.forEach((prop) => {
				describe(`Property - ${prop}`, () => {
					if (prop !== "ttl") {
						beforeEach(() => cache.plugins = [DynamoDB({dynamodb, "ttlAttribute": prop, "tableName": "TestTable"})]);
					}

					it("Should use correct TTL", async () => {
						const DIFFERENCE_ALLOWED = 1000;

						cache.settings.ttl = 1;
						await cache.put("id", {"myitem": "Hello World"});

						const dbItem = AWS.DynamoDB.Converter.unmarshall((await dynamodb.getItem({
							"Key": {
								"id": {
									"S": "id"
								}
							},
							"TableName": "TestTable"
						}).promise()).Item);
						delete dbItem.id;

						const myttl = dbItem[prop];
						delete dbItem[prop];
						expect(myttl).to.be.within((Date.now() - DIFFERENCE_ALLOWED) / 1000, (Date.now() + DIFFERENCE_ALLOWED) / 1000);
						expect(dbItem).to.eql({"data": {"myitem": "Hello World"}});
					});
				});
			});
		});
	});

	describe("remove()", () => {
		beforeEach(() => dynamodb.putItem({
			"Item": AWS.DynamoDB.Converter.marshall({"id": "id", "data": {"myitem": "Hello World"}}),
			"TableName": "TestTable"
		}).promise());

		it("Should remove item from DynamoDB cache", async () => {
			await cache.remove("id");

			const data = AWS.DynamoDB.Converter.unmarshall((await dynamodb.getItem({
				"Key": {
					"id": {
						"S": "id"
					}
				},
				"TableName": "TestTable"
			}).promise()).Item);

			expect(data).to.eql({});
		});

		it("Should fail silently if no item in cache", async () => {
			let error;
			try {
				await cache.remove("id3");
			} catch (e) {
				error = e;
			}

			expect(error).to.not.exist;
		});
	});
});
