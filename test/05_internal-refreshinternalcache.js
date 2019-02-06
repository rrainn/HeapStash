const HeapStash = require("../");
const {expect} = require("chai");

describe("_.refreshinternalcache()", () => {
	let cache;
	beforeEach(() => cache = new HeapStash());

	it("Should remove item if ttl is in the past", () => {
		cache._.internalcache["test"] = {"item": 123, "ttl": 0};

		cache._.refreshinternalcache();

		expect(cache._.internalcache).to.eql({});
	});

	it("Should remove all items if ttl is in the past", () => {
		cache._.internalcache["test"] = {"item": 123, "ttl": 0};
		cache._.internalcache["test1"] = {"item": 123, "ttl": 1};
		cache._.internalcache["test2"] = {"item": 123, "ttl": 2};

		cache._.refreshinternalcache();

		expect(cache._.internalcache).to.eql({});
	});

	it("Should keep items in the future", () => {
		cache._.internalcache["test"] = {"item": 123, "ttl": 0};
		cache._.internalcache["test1"] = {"item": 123, "ttl": 1};
		cache._.internalcache["test2"] = {"item": 123, "ttl": 2};
		cache._.internalcache["test3"] = {"item": 123, "ttl": Date.now() + 1000};
		cache._.internalcache["test4"] = {"item": 123, "ttl": Date.now() + 1001};

		cache._.refreshinternalcache();

		expect(Object.keys(cache._.internalcache).length).to.eql(2);
	});
});
