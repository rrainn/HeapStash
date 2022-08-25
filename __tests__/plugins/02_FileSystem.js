const HeapStash = require("../../dist");
const FileSystem = HeapStash.Plugin.FileSystem;
const path = require("path");
const fs = require("fs");
const del = require("del");

describe("FileSystem", () => {
	let cache;
	beforeEach(() => cache = new HeapStash());
	beforeEach(() => cache.plugins.push(FileSystem({"path": path.join(__dirname, "tmp")})));
	afterEach(() => del([path.join(__dirname, "tmp")]));
	beforeEach(() => new Promise((resolve, reject) => fs.mkdir(path.join(__dirname, "tmp"), (err) => {
		if (err) {
			reject(err);
		} else {
			resolve();
		}
	})));

	describe("get()", () => {
		beforeEach(() => new Promise((resolve, reject) => fs.writeFile(path.join(__dirname, "tmp", "id"), JSON.stringify({"data": {"myitem": "Hello World"}}), (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		})));
		beforeEach(() => new Promise((resolve, reject) => fs.writeFile(path.join(__dirname, "tmp", "id2"), "test", (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		})));

		it("Should return correct item", async () => {
			const res = await cache.get("id");

			expect(res).toEqual({"myitem": "Hello World"});
		});

		it("Should return undefined for item that does not exist", async () => {
			const res = await cache.get("other");

			expect(res).toBeUndefined();
		});

		it("Should return undefined for item that is not a JSON object", async () => {
			const res = await cache.get("id2");

			expect(res).toBeUndefined();
		});
	});

	describe("put()", () => {
		it("Should put item in file system cache", async () => {
			await cache.put("id", {"myitem": "Hello World"});

			return new Promise((resolve, reject) => fs.readFile(path.join(__dirname, "tmp", "id"), "utf8", (err, data) => {
				if (err) {
					reject(err);
				} else {
					try {
						data = JSON.parse(data);
						expect(data).toEqual({"data": {"myitem": "Hello World"}});
						resolve();
					} catch (e) {
						reject(e);
					}
				}
			}));
		});

		it("Should put item in file system cache with different ttl", async () => {
			const DIFFERENCE_ALLOWED = 10;

			await cache.put("id", {"myitem": "Hello World"}, {"pluginTTL": 500});

			return new Promise((resolve, reject) => fs.readFile(path.join(__dirname, "tmp", "id"), "utf8", (err, data) => {
				if (err) {
					reject(err);
				} else {
					try {
						data = JSON.parse(data);
						expect(data.data).toEqual({"myitem": "Hello World"});
						expect(data.ttl - 500).toBeWithinRange(Date.now() - DIFFERENCE_ALLOWED, Date.now() + DIFFERENCE_ALLOWED);
						resolve();
					} catch (e) {
						reject(e);
					}
				}
			}));
		});
	});

	describe("remove()", () => {
		beforeEach(() => new Promise((resolve, reject) => fs.writeFile(path.join(__dirname, "tmp", "id"), JSON.stringify({"data": {"myitem": "Hello World"}}), (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		})));

		it("Should remove item from file system cache", async () => {
			await cache.remove("id");
			expect(() => fs.readFileSync(path.join(__dirname, "tmp", "id"), "utf8")).toThrow("ENOENT: no such file or directory");
		});

		it("Should fail silently if no item in cache", async () => {
			let error;
			try {
				await cache.remove("id3");
			} catch (e) {
				error = e;
			}

			expect(error).toBeUndefined();
		});
	});

	describe("clear()", () => {
		beforeEach(() => new Promise((resolve, reject) => fs.writeFile(path.join(__dirname, "tmp", "id"), JSON.stringify({"data": {"myitem": "Hello World"}}), (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		})));

		it("Should clear item from file system cache", async () => {
			await cache.clear();
			expect(() => fs.readFileSync(path.join(__dirname, "tmp", "id"), "utf8")).toThrow("ENOENT: no such file or directory");
		});

		it("Should fail silently if no item in cache", async () => {
			let error;
			try {
				await cache.clear();
			} catch (e) {
				error = e;
			}

			expect(error).toBeUndefined();
		});
	});
});
