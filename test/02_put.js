const HeapStash = require("../");
const {expect} = require("chai");

describe("put()", () => {
	let cache;
	beforeEach(() => cache = new HeapStash());

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

		expect(cache._.internalcache).to.eql({"test": {"data": {"item": 123}}});
	});

	it("Should not put duplicate items in internalcache", () => {
		cache.put("test", {"item": 123});
		cache.put("test", {"item": 123});

		expect(cache._.internalcache).to.eql({"test": {"data": {"item": 123}}});
	});

	it("Should replace item if duplicate id", () => {
		cache.put("test", {"item": 123});
		cache.put("test", {"item": 456});

		expect(cache._.internalcache).to.eql({"test": {"data": {"item": 456}}});
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

		expect(cache._.internalcache).to.eql({"myapp_test": {"data": {"item": 123}}});
	});
});
