const HeapStash = require("../");

describe("General", () => {
	let cache;
	beforeEach(() => cache = new HeapStash());

	describe("Different Types", () => {
		const tests = [1, "Hello World", true, false, () => {}, [1, 2, 3], {"data": 1}];

		tests.forEach((test) => {
			it(`Should store ${typeof test === "object" ? JSON.stringify(test) : test} correctly`, async () => {
				await cache.put("item", test);
				expect(await cache.get("item")).toEqual(test);
			});
		});
	});
});
