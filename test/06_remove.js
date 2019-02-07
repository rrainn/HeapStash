const HeapStash = require("../");
const {expect} = require("chai");

describe("remove()", () => {
	let cache;
	beforeEach(() => cache = new HeapStash());

	it("Should be a function", () => {
		expect(cache.remove).to.be.a("function");
	});

	it("Should throw error if no ID passed in", async () => {
		let error;
		try {
			await cache.remove();
		} catch (e) {
			error = e;
		}
		expect(error.message).to.eql("ID required to delete item from cache.");
	});

	it("Should remove item from cache", async () => {
		cache._.internalcache["test"] = {"data": 123};
		cache._.internalcachearray.push("test");

		await cache.remove("test");

		expect(cache._.internalcache).to.eql({});
	});

	it("Should fail silently if item not in cache", async () => {
		await cache.remove("test");

		expect(cache._.internalcache).to.eql({});
	});

	it("Should fail silently if item not in cache array", async () => {
		cache._.internalcache["test"] = {"data": 123};

		await cache.remove("test");

		expect(cache._.internalcache).to.eql({});
	});

	it("Should not call any plugins if internalCacheOnly is set to true", async () => {
		let called = false;
		const plugin = new HeapStash.Plugin();
		plugin.tasks.remove = () => {
			called = true;
		};
		cache.plugins.push(plugin);

		await cache.remove("test", {"internalCacheOnly": true});

		expect(called).to.be.false;
	});
});
