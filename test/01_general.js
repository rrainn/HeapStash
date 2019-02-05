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

			expect(cache._.internalcache).to.eql([{"item": 123, "id": "test"}]);
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

		it("Should return undefined if item doesn't exist in cache", () => {
			cache.put("test", {"item": 123});

			expect(cache.get("test")).to.eql({"item": 123, "id": "test"});
		});
	});
});
