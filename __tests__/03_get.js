const HeapStash = require("../");

describe("get()", () => {
	let cache;
	beforeEach(() => cache = new HeapStash());

	it("Should be a function", () => {
		expect(cache.get).toBeOfType("function");
	});

	it("Should throw if no string passed in for ID", async () => {
		let error;
		try {
			await cache.get();
		} catch (e) {
			error = e;
		}
		expect(error.message).toEqual("ID required to get item from cache.");
	});

	it("Should return undefined if item doesn't exist in cache", async () => {
		expect(await cache.get("test")).toBeUndefined();
	});

	it("Should return item if exists in cache", async () => {
		await cache.put("test", {"item": 123});

		expect(await cache.get("test")).toEqual({"item": 123});
	});

	it("Should return undefined if TTL is in the past", async () => {
		cache._.internalcache["test"] = {"data": 123, "ttl": 0};

		expect(await cache.get("test")).toBeUndefined();
	});

	it("Should return item if TTL is in the future", async () => {
		const data = {"data": 123, "ttl": Date.now() + 1000};
		cache._.internalcache["test"] = data;

		expect(await cache.get("test")).toEqual(data.data);
	});

	it("Should get item with idPrefix", async () => {
		cache.put("myapp_test", {"item": 123});
		cache.settings.idPrefix = "myapp_";

		expect(await cache.get("test")).toEqual({"item": 123});
	});

	it("Should not call any plugins if internalCacheOnly is set to true", async () => {
		let called = false;
		const plugin = new HeapStash.Plugin();
		plugin.tasks.get = () => {
			called = true;
		};
		cache.plugins.push(plugin);

		await cache.get("test", {"internalCacheOnly": true});

		expect(called).toEqual(false);
	});
});
