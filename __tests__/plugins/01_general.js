const HeapStash = require("../../");

describe("Plugins", () => {
	let cache;
	beforeEach(() => cache = new HeapStash());

	it("Should have plugins array property", () => {
		expect(cache.plugins).toEqual([]);
	});

	it("Should have Plugin property", () => {
		expect(HeapStash.Plugin).toBeOfType("function");
	});

	it("Should have run method on plugin instance", () => {
		const plugin = new HeapStash.Plugin();

		expect(plugin.run).toBeOfType("function");
	});

	it("Should have tasks object on plugin instance", () => {
		const plugin = new HeapStash.Plugin();

		expect(plugin.tasks).toEqual({});
	});

	it("Should return function when calling run", () => {
		const plugin = new HeapStash.Plugin();

		expect(plugin.run("test")).toBeOfType("function");
	});

	it("Should fail silently when trying to call run with invalid property", () => {
		const plugin = new HeapStash.Plugin();

		let error;
		try {
			plugin.run("test")();
		} catch (e) {
			error = e;
		}
		expect(error).toBeUndefined();
	});
});
