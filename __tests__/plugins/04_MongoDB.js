const HeapStash = require("../../dist");
const MongoDB = HeapStash.Plugin.MongoDB;
const {MongoClient} = require('mongodb');

describe("MongoDB", function () {
	let connection, db, cache, collectionName;
	const dbName = global.__MONGO_DB_NAME__;
	beforeAll(async () => {
		connection = await MongoClient.connect(global.__MONGO_URI__, {
			useNewUrlParser: true,
		});
		db = connection.db(dbName);
	});
	afterAll(async () => {
		await connection.close();
	});
	beforeEach(() => collectionName = `test-${Date.now()}`);
	beforeEach(() => cache = new HeapStash());
	beforeEach(async () => cache.plugins.push(await MongoDB({
		"client": connection,
		"db": dbName,
		"collection": collectionName
	})));

	describe("get()", () => {
		beforeEach(() => db.collection(collectionName).insertOne({
			"id": "id", "data": { "myitem": "Hello World" }
		}));
		beforeEach(() => db.collection(collectionName).insertOne({
			"id": "id2", "data": "test"
		}));

		it("Should return correct item", async () => {
			const res = await cache.get("id");

			expect(res).toEqual({ "myitem": "Hello World" });
		});

		it("Should return undefined for item that does not exist", async () => {
			const res = await cache.get("other");

			expect(res).toBeUndefined();
		});

		it("Should return correct item that is not a JSON object", async () => {
			const res = await cache.get("id2");

			expect(res).toEqual("test");
		});

		it("Should work with empty strings in object", async () => {
			const obj = { "myitem": "Hello World", "myseconditem": "", "myobj": { "hello": "world", "str": "" } };
			await cache.put("mySpecialID", obj);

			cache._.internalcache = {};
			cache._.internalcachearray = [];

			const res = await cache.get("mySpecialID");

			expect(res).toEqual(obj);
		});

		describe("TTL", () => {
			beforeEach(() => db.collection(collectionName).insertOne({
				"id": "id3", "expireAt": new Date(Date.now() / 1000), "data": "test"
			}));
			beforeEach(() => db.collection(collectionName).insertOne({
				"id": "id4", "expireAt": new Date((Date.now() * (1000 * 60)) / 1000), "data": "test"
			}));


			// it("Should return correct item for ttl in the past", async () => {
			// 	const res = await cache.get("id3");

			// 	expect(res).toBeUndefined();
			// });

			it("Should return correct item for ttl in the future", async () => {
				const res = await cache.get("id4");

				expect(res).toEqual("test");
			});
		});
	});

	describe("put()", () => {
		it("Should put item in MongoDB", async () => {
			await cache.put("id", { "myitem": "Hello World" });

			const dbItem = await db.collection(collectionName).findOne({ "id": "id" });
			delete dbItem.id;
			delete dbItem._id;

			expect(dbItem).toEqual({ "data": { "myitem": "Hello World" } });
		});

		it("Should work with empty strings", async () => {
			await cache.put("id", { "myitem": "Hello World", "myseconditem": "", "myobj": { "hello": "world", "str": "" } });

			const dbItem = await db.collection(collectionName).findOne({ "id": "id" });
			delete dbItem.id;
			delete dbItem._id;

			expect(dbItem).toEqual({ "data": { "myitem": "Hello World", "myseconditem": "", "myobj": { "hello": "world", "str": "" } } });
		});

		describe("TTL", () => {
			const DIFFERENCE_ALLOWED = 1000;

			it("Should use correct TTL", async () => {
				cache.settings.ttl = 1;
				await cache.put("id", { "myitem": "Hello World" });

				const dbItem = await db.collection(collectionName).findOne({ "id": "id" });
				delete dbItem.id;
				delete dbItem._id;

				const myttl = dbItem.expireAt;
				delete dbItem.expireAt;
				expect(myttl.getTime()).toBeWithinRange((Date.now() - DIFFERENCE_ALLOWED), (Date.now() + DIFFERENCE_ALLOWED));
				expect(dbItem).toEqual({ "data": { "myitem": "Hello World" } });
			});

			it("Should use correct TTL for empty strings", async () => {
				const obj = { "myitem": "Hello World", "myseconditem": "", "myobj": { "hello": "world", "str": "" } };
				cache.settings.ttl = 1;
				await cache.put("id", obj);

				const dbItem = await db.collection(collectionName).findOne({ "id": "id" });
				delete dbItem.id;
				delete dbItem._id;

				const myttl = dbItem.expireAt;
				delete dbItem.expireAt;
				expect(myttl).toBeWithinRange((Date.now() - DIFFERENCE_ALLOWED), (Date.now() + DIFFERENCE_ALLOWED));
				expect(dbItem).toEqual({ "data": obj });
			});
		});
	});

	describe("remove()", () => {
		beforeEach(() => db.collection(collectionName).insertOne({
			"id": "id", "data": { "myitem": "Hello World" }
		}));

		it("Should remove item from MongoDB cache", async () => {
			await cache.remove("id");

			const data = await db.collection(collectionName).findOne({ "id": "id" });
			expect(data).toEqual(null);
		});

		it("Should fail silently if no item in cache", async () => {
			let error;
			try {
				await cache.remove("id3");
			} catch (e) {
				error = e;
			}

			expect(error).toBeUndefined();
		});
	});

	describe("clear()", () => {
		beforeEach(() => db.collection(collectionName).insertOne({
			"id": "id", "data": { "myitem": "Hello World" }
		}));

		it("Should clear item from MongoDB cache", async () => {
			await cache.clear();

			const data = await db.collection(collectionName).findOne({ "id": "id" });
			expect(data).toEqual(null);
		});

		it("Should clear items from MongoDB cache", async () => {
			const dataMap = { "myitem": "Hello World", "largestring": new Array(100000).fill("a").join("") };
			await Promise.all((new Array(15).fill("a").map((a, index) => index + 1)).map((item) => db.collection(collectionName).insertOne({
				"id": `id${item}`, dataMap
			})));

			await cache.clear();

			const data = await db.collection(collectionName).find({}).toArray();
			expect(data).toEqual([]);
		});

		it("Should fail silently if no item in cache", async () => {
			let error;
			try {
				await cache.clear();
			} catch (e) {
				error = e;
			}

			expect(error).toBeUndefined();
		});
	});
});
