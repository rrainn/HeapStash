const HeapStash = require("../");
const {expect} = require("chai");

describe("remove()", () => {
	let cache;
	beforeEach(() => cache = new HeapStash());

	it("Should be a function", () => {
		expect(cache.remove).to.be.a("function");
	});

	it("Should throw error if no ID passed in", () => {
		expect(cache.remove).to.throw("ID required to delete item from cache.");
	});

	it("Should remove item from cache", () => {
		cache._.internalcache["test"] = {"data": 123};
		cache._.internalcachearray.push("test");

		cache.remove("test");

		expect(cache._.internalcache).to.eql({});
	});

	it("Should fail silently if item not in cache", () => {
		cache.remove("test");

		expect(cache._.internalcache).to.eql({});
	});

	it("Should fail silently if item not in cache array", () => {
		cache._.internalcache["test"] = {"data": 123};

		cache.remove("test");

		expect(cache._.internalcache).to.eql({});
	});
});
