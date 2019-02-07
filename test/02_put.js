const HeapStash = require("../");
const {expect} = require("chai");

describe("put()", () => {
	let cache;
	beforeEach(() => cache = new HeapStash());

	it("Should be a function", () => {
		expect(cache.put).to.be.a("function");
	});

	it("Should throw if no string passed in for ID", async () => {
		let error;
		try {
			await cache.put();
		} catch (e) {
			error = e;
		}
		expect(error.message).to.eql("ID required to put item in cache.");
	});

	it("Should throw if nothing passed in for item", async () => {
		let error;
		try {
			await cache.put("test");
		} catch (e) {
			error = e;
		}
		expect(error.message).to.eql("Item required to put item in cache.");
	});

	it("Should not throw if correct attributes passed in", async () => {
		let error;
		try {
			await cache.put("test", {"item": 123});
		} catch (e) {
			error = e;
		}
		expect(error).to.not.exist;
	});

	it("Should put item in internalcache", async () => {
		await cache.put("test", {"item": 123});

		expect(cache._.internalcache).to.eql({"test": {"data": {"item": 123}}});
	});

	it("Should put item in internalcachearray", async () => {
		await cache.put("test", {"item": 123});

		expect(cache._.internalcachearray).to.eql(["test"]);
	});

	it("Should not put duplicate items in internalcache", async () => {
		await cache.put("test", {"item": 123});
		await cache.put("test", {"item": 123});

		expect(cache._.internalcache).to.eql({"test": {"data": {"item": 123}}});
	});

	it("Should replace item if duplicate id", async () => {
		await cache.put("test", {"item": 123});
		await cache.put("test", {"item": 456});

		expect(cache._.internalcache).to.eql({"test": {"data": {"item": 456}}});
	});

	it("Should put item in internalcache with ttl if specified in settings", async () => {
		const DIFFERENCE_ALLOWED = 10;
		cache.settings.ttl = 1;
		await cache.put("test", {"item": 123});

		expect(cache._.internalcache["test"].ttl).to.be.within(Date.now() - DIFFERENCE_ALLOWED, Date.now() + DIFFERENCE_ALLOWED);
	});

	it("Should put item with idPrefix", async () => {
		cache.settings.idPrefix = "myapp_";
		await cache.put("test", {"item": 123});

		expect(cache._.internalcache).to.eql({"myapp_test": {"data": {"item": 123}}});
	});

	it("Should remove old items if maxItems is exceeded", async () => {
		cache.settings.maxItems = 2;
		await cache.put("test", {"item": 123});
		await cache.put("test1", {"item": 123});
		await cache.put("test2", {"item": 123});

		expect(cache._.internalcache).to.eql({"test1": {"data": {"item": 123}}, "test2": {"data": {"item": 123}}});
		expect(cache._.internalcachearray).to.eql(["test1", "test2"]);
	});

	it("Should not call any plugins if internalCacheOnly is set to true", async () => {
		let called = false;
		const plugin = new HeapStash.Plugin();
		plugin.tasks.put = () => {
			called = true;
		};
		cache.plugins.push(plugin);

		await cache.put("test", {"item": 123}, {"internalCacheOnly": true});

		expect(called).to.be.false;
	});
});
