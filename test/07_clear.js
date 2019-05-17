const HeapStash = require("../");
const {expect} = require("chai");

describe("clear()", () => {
	let cache;
	beforeEach(() => cache = new HeapStash());

	it("Should be a function", () => {
		expect(cache.clear).to.be.a("function");
	});

	it("Should clear item from cache", async () => {
		cache._.internalcache["test"] = {"data": 123};
		cache._.internalcachearray.push("test");

		await cache.clear();

		expect(cache._.internalcache).to.eql({});
		expect(cache._.internalcachearray).to.eql([]);
	});

	it("Should clear items from cache", async () => {
		(new Array(50).fill("a").map((a, index) => index + 1)).forEach((item) => {
			cache._.internalcache[`test${item}`] = {"data": item * 50};
			cache._.internalcachearray.push(`test${item}`);
		});

		expect(cache._.internalcachearray.length).to.eql(50);

		await cache.clear();

		expect(cache._.internalcache).to.eql({});
		expect(cache._.internalcachearray).to.eql([]);
	});

	it("Should fail silently if nothing in cache", async () => {
		await cache.clear();

		expect(cache._.internalcache).to.eql({});
		expect(cache._.internalcachearray).to.eql([]);
	});

	it("Should not call any plugins if internalCacheOnly is set to true", async () => {
		let called = false;
		const plugin = new HeapStash.Plugin();
		plugin.tasks.clear = () => {
			called = true;
		};
		cache.plugins.push(plugin);

		await cache.clear({"internalCacheOnly": true});

		expect(called).to.be.false;
	});
});
