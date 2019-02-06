const HeapStash = require("../");
const {expect} = require("chai");

describe("General", () => {
	let cache;
	beforeEach(() => cache = new HeapStash());

	describe("Different Types", () => {
		const tests = [1, "Hello World", true, false, () => {}, [1, 2, 3], {"data": 1}];

		tests.forEach((test) => {
			it(`Should store ${typeof test === "object" ? JSON.stringify(test) : test} correctly`, () => {
				cache.put("item", test);
				expect(cache.get("item")).to.eql(test);
			});
		});
	});
});
