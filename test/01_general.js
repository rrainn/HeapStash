const HeapStash = require("../");
const {expect} = require("chai");

describe("General", () => {
	let cache;

	beforeEach(() => cache = new HeapStash());

	describe("put()", () => {
		it("Should be a function", () => {
			expect(cache.put).to.be.a("function");
		});

		it("Should throw if no string passed in for ID", () => {
			expect(cache.put).to.throw("ID required to put item in cache.");
		});

		it("Should throw if nothing passed in for item", () => {
			expect(() => cache.put("test")).to.throw("Item required to put item in cache.");
		});

		it("Should not throw if correct attributes passed in", () => {
			expect(() => cache.put("test", {"item": 123})).to.not.throw();
		});

		it("Should put item in internalcache", () => {
			cache.put("test", {"item": 123});

			expect(cache._.internalcache).to.eql({"test": {"item": 123}});
		});

		it("Should not put duplicate items in internalcache", () => {
			cache.put("test", {"item": 123});
			cache.put("test", {"item": 123});

			expect(cache._.internalcache).to.eql({"test": {"item": 123}});
		});

		it("Should replace item if duplicate id", () => {
			cache.put("test", {"item": 123});
			cache.put("test", {"item": 456});

			expect(cache._.internalcache).to.eql({"test": {"item": 456}});
		});

		it("Should put item in internalcache with ttl if specified in settings", () => {
			const DIFFERENCE_ALLOWED = 10;
			cache.settings.ttl = 1;
			cache.put("test", {"item": 123});

			expect(cache._.internalcache["test"].ttl).to.be.within(Date.now() - DIFFERENCE_ALLOWED, Date.now() + DIFFERENCE_ALLOWED);
		});

		it("Should put item with idPrefix", () => {
			cache.settings.idPrefix = "myapp_";
			cache.put("test", {"item": 123});

			expect(cache._.internalcache).to.eql({"myapp_test": {"item": 123}});
		});
	});

	describe("get()", () => {
		it("Should be a function", () => {
			expect(cache.get).to.be.a("function");
		});

		it("Should throw if no string passed in for ID", () => {
			expect(cache.get).to.throw("ID required to get item from cache.");
		});

		it("Should return undefined if item doesn't exist in cache", () => {
			expect(cache.get("test")).to.be.undefined;
		});

		it("Should return item if exists in cache", () => {
			cache.put("test", {"item": 123});

			expect(cache.get("test")).to.eql({"item": 123});
		});

		it("Should return undefined if TTL is in the past", () => {
			cache.put("test", {"item": 123, "ttl": 0});

			expect(cache.get("test")).to.be.undefined;
		});

		it("Should return item if TTL is in the future", () => {
			const data = {"item": 123, "ttl": Date.now() + 1000};
			cache.put("test", data);

			expect(cache.get("test")).to.eql(data);
		});

		it("Should get item with idPrefix", () => {
			cache.put("myapp_test", {"item": 123});
			cache.settings.idPrefix = "myapp_";

			expect(cache.get("test")).to.eql({"item": 123});
		});
	});

	describe("_.refreshinternalcache()", () => {
		it("Should remove item if ttl is in the past", () => {
			cache.put("test", {"item": 123, "ttl": 0});

			cache._.refreshinternalcache();

			expect(cache._.internalcache).to.eql({});
		});

		it("Should remove all items if ttl is in the past", () => {
			cache.put("test", {"item": 123, "ttl": 0});
			cache.put("test1", {"item": 123, "ttl": 1});
			cache.put("test2", {"item": 123, "ttl": 2});

			cache._.refreshinternalcache();

			expect(cache._.internalcache).to.eql({});
		});

		it("Should keep items in the future", () => {
			cache.put("test", {"item": 123, "ttl": 0});
			cache.put("test1", {"item": 123, "ttl": 1});
			cache.put("test2", {"item": 123, "ttl": 2});
			cache.put("test3", {"item": 123, "ttl": Date.now() + 1000});
			cache.put("test4", {"item": 123, "ttl": Date.now() + 1001});

			cache._.refreshinternalcache();

			expect(Object.keys(cache._.internalcache).length).to.eql(2);
		});
	});
});
