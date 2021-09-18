const HeapStash = require("../../dist");
const RedisPlugin = HeapStash.Plugin.Redis;
const redisMock = () => {
	let expirationTimes = {};
	let items = {};

	return {
		get: (key) => {
			const expirationTime = expirationTimes[key];
			if (expirationTime && expirationTime < Date.now()) {
				delete items[key];
				delete expirationTimes[key];
			}

			return items[key];
		},
		set: (key, value, code, secondsTillExpire) => {
			if (code === "EX") {
				expirationTimes[key] = Date.now() + secondsTillExpire * 1000;
			}
			items[key] = value;
		},
		keys: (pattern) => {
			if (pattern === "*") {
				return Object.keys(items);
			}

			return Object.keys(items).filter((key) => key.match(pattern));
		},
		del: (key) => {
			delete items[key];
			delete expirationTimes[key];
		},
		flushdb: () => {
			items = {};
			expirationTimes = {};
		}
	};
};

describe("Redis", function () {
	let connection, cache;
	beforeEach(async () => {
		connection = redisMock();
	});
	beforeEach(() => cache = new HeapStash());
	beforeEach(() => cache.plugins.push(RedisPlugin({
		"client": connection
	})));

	describe("get()", () => {
		beforeEach(async () => await connection.set("id", JSON.stringify({
			"id": "id", "data": { "myitem": "Hello World" }
		})));
		beforeEach(async () => await connection.set("id2", JSON.stringify({
			"id": "id2", "data": "test"
		})));

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
			beforeEach(() => connection.set("id3", JSON.stringify({
				"id": "id3", "expireAt": new Date(Date.now() - (60 * 1000)), "data": "test"
			}), "EX", -60));
			beforeEach(() => connection.set("id4", JSON.stringify({
				"id": "id4", "expireAt": new Date(Date.now() + (60 * 1000)), "data": "test"
			}), "EX", 60));

			it("Should return correct item for ttl in the past", async () => {
				const res = await cache.get("id3");

				expect(res).toBeUndefined();
			});

			it("Should return correct item for ttl in the future", async () => {
				const res = await cache.get("id4");

				expect(res).toEqual("test");
			});
		});
	});

	describe("put()", () => {
		it("Should put item in Redis", async () => {
			await cache.put("id", { "myitem": "Hello World" });

			const dbItem = JSON.parse(await connection.get("id"));
			delete dbItem.id;

			expect(dbItem).toEqual({ "data": { "myitem": "Hello World" } });
		});

		it("Should work with empty strings", async () => {
			await cache.put("id", { "myitem": "Hello World", "myseconditem": "", "myobj": { "hello": "world", "str": "" } });

			const dbItem = JSON.parse(await connection.get("id"));
			delete dbItem.id;

			expect(dbItem).toEqual({ "data": { "myitem": "Hello World", "myseconditem": "", "myobj": { "hello": "world", "str": "" } } });
		});

		describe("TTL", () => {
			const DIFFERENCE_ALLOWED = 1000;

			it("Should use correct TTL", async () => {
				cache.settings.ttl = 1;
				await cache.put("id", { "myitem": "Hello World" });

				const dbItem = JSON.parse(await connection.get("id"));
				delete dbItem.id;

				const myttl = dbItem.ttl;
				delete dbItem.ttl;
				expect(myttl).toBeWithinRange((Date.now() - DIFFERENCE_ALLOWED), (Date.now() + DIFFERENCE_ALLOWED));
				expect(dbItem).toEqual({ "data": { "myitem": "Hello World" } });
			});

			it("Should use correct TTL for empty strings", async () => {
				const obj = { "myitem": "Hello World", "myseconditem": "", "myobj": { "hello": "world", "str": "" } };
				cache.settings.ttl = 1;
				await cache.put("id", obj);

				const dbItem = JSON.parse(await connection.get("id"));
				delete dbItem.id;

				const myttl = dbItem.ttl;
				delete dbItem.ttl;
				expect(myttl).toBeWithinRange((Date.now() - DIFFERENCE_ALLOWED), (Date.now() + DIFFERENCE_ALLOWED));
				expect(dbItem).toEqual({ "data": obj });
			});
		});
	});

	describe("remove()", () => {
		beforeEach(async () => await connection.set("id", JSON.stringify({
			"id": "id", "data": { "myitem": "Hello World" }
		})));

		it("Should remove item from Redis cache", async () => {
			await cache.remove("id");

			const data = await connection.get("id");
			expect(data).toEqual(undefined);
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
		beforeEach(async () => await connection.set("id", JSON.stringify({
			"id": "id", "data": { "myitem": "Hello World" }
		})));

		it("Should clear item from Redis cache", async () => {
			await cache.clear();

			const data = await connection.get("id");
			expect(data).toBeUndefined();
		});

		it("Should clear items from Redis cache", async () => {
			const dataMap = { "myitem": "Hello World", "largestring": new Array(100000).fill("a").join("") };
			await Promise.all((new Array(15).fill("a").map((a, index) => index + 1)).map((item) => connection.set(`id${item}`, JSON.stringify({
				"id": `id${item}`, dataMap
			}))));

			await cache.clear();

			const data = await connection.keys("*");
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
