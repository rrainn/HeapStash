const HeapStash = require("../dist");
const Plugin = HeapStash.Plugin;

describe("fetch()", () => {
	let cache;
	beforeEach(() => cache = new HeapStash());

	it("Should be a function", () => {
		expect(cache.fetch).toBeOfType("function");
	});

	it("Should throw error if no ID passed in", () => {
		expect(cache.fetch).toThrow("ID required to fetch item.");
	});

	it("Should throw error if no retrieveFunction passed in", () => {
		expect(() => cache.fetch("test")).toThrow("Retrieve function required to fetch item.");
	});

	it("Should return a promise", () => {
		expect(cache.fetch("test", () => ({"data": "test"}))).toBeInstanceOf(Promise);
	});

	it("Should return item from cache if exists", async () => {
		cache.put("test", {"result": "data"});
		const res = await cache.fetch("test", () => ({"result": "data"}));

		expect(res).toEqual({"result": "data"});
	});

	it("Should put item in cache with custom ttl", async () => {
		const DIFFERENCE_ALLOWED = 10;
		cache.settings.ttl = 60000;
		await cache.fetch("test", {"ttl": 1}, () => {
			return "Hello World";
		});

		expect(cache._.internalcache["test"].ttl).toBeWithinRange(Date.now() - DIFFERENCE_ALLOWED, Date.now() + DIFFERENCE_ALLOWED);
	});

	it("Should put item in cache with no ttl", async () => {
		cache.settings.ttl = 60000;
		await cache.fetch("test", {"ttl": false}, () => {
			return "Hello World";
		});

		expect(cache._.internalcache["test"].ttl).toBeUndefined();
	});

	it("Should not use plugins for internalCacheOnly", async () => {
		let called = 0;
		const emptyFunc = () => {
			called++;
			return null;
		};
		cache.plugins.push({
			"get": emptyFunc,
			"put": emptyFunc,
		});
		const expectResult = "Hello World";
		const result = await cache.fetch("test", {"internalCacheOnly": true}, () => {
			return expectResult;
		});

		expect(called).toEqual(0);
		expect(result).toEqual(expectResult);
	});

	it("Should call retrieveFunction if not in cache and not currently retrieving", async () => {
		let calledRetrieveFunction = false;
		let cacheinprogressfetchpromises;
		const res = await cache.fetch("test", async () => {
			calledRetrieveFunction = true;
			cacheinprogressfetchpromises = {...cache._.inprogressfetchpromises};
			return {"result": "data"};
		});

		expect(calledRetrieveFunction).toEqual(true);
		expect(cacheinprogressfetchpromises).toEqual({"test": []});
		expect(res).toEqual({"result": "data"});
		expect(cache._.inprogressfetchpromises).toEqual({});
	});

	it("Should call retrieveFunction if not in cache and not currently retrieving and handle throwing error correctly", async () => {
		let calledRetrieveFunction = false;
		let cacheinprogressfetchpromises, res, error;
		try {
			res = await cache.fetch("test", async () => {
				calledRetrieveFunction = true;
				cacheinprogressfetchpromises = {...cache._.inprogressfetchpromises};
				throw new Error("Error");
			});
		} catch (e) {
			error = e;
		}

		expect(calledRetrieveFunction).toEqual(true);
		expect(cacheinprogressfetchpromises).toEqual({"test": []});
		expect(res).toBeUndefined();
		expect(error.message).toEqual("Error");
		expect(cache._.inprogressfetchpromises).toEqual({});
	});

	it("Should add resolve and reject methods to array if pending action", (done) => {
		let counter = 0;
		const func = () => {
			counter++;
			return new Promise(() => {});
		};
		cache.fetch("test", func);
		cache.fetch("test", func);

		setTimeout(() => {
			expect(cache._.inprogressfetchpromises["test"]).toBeInstanceOf(Array);
			expect(cache._.inprogressfetchpromises["test"].length).toEqual(1);
			expect(cache._.inprogressfetchpromises["test"][0].resolve).toBeOfType("function");
			expect(cache._.inprogressfetchpromises["test"][0].reject).toBeOfType("function");
			expect(counter).toEqual(1);

			done();
		}, 1);
	});

	it("Should call resolve on other promise after resolved", (done) => {
		let finalize;
		const func = () => {
			return new Promise((resolve) => {
				finalize = () => {
					resolve({"data": "test"});
				};
			});
		};
		cache.fetch("test", func);

		setTimeout(async () => {
			finalize();
			const res = await cache.fetch("test", func);

			expect(res).toEqual({"data": "test"});
			expect(cache._.inprogressfetchpromises).toEqual({});

			done();
		}, 1);
	});

	it("Should call reject on other promise after resolved", (done) => {
		let finalize, res, error;
		const func = () => {
			return new Promise((resolve, reject) => {
				finalize = () => {
					reject(new Error("Error"));
				};
			});
		};

		function check() {
			expect(error.message).toEqual("Error");
			expect(res).toBeUndefined();
			expect(cache._.inprogressfetchpromises).toEqual({});

			done();
		}

		cache.fetch("test", func).catch(() => {});
		cache.fetch("test", func).then((data) => res = data).catch((e) => {
			error = e;
			check();
		});

		setTimeout(async () => {
			finalize();
		}, 1);
	});

	it("Should only call plugin once", (done) => {
		const func = () => {
			return new Promise(() => {});
		};

		let count = 0;
		const plugin = new Plugin();
		plugin.tasks.get = async () => {
			count++;

			return new Promise(() => {});
		};
		cache.plugins.push(plugin);

		cache.fetch("test", func);
		cache.fetch("test", func);
		cache.fetch("test", func);

		setTimeout(async () => {
			expect(count).toEqual(1);

			done();
		}, 1);
	});

	it("Should only call plugin once and resolve correctly", async () => {
		let finalize;
		const func = () => {
			return new Promise(() => {});
		};

		const plugin = new Plugin();
		plugin.tasks.get = async () => {
			return new Promise((resolve) => {
				finalize = () => {
					resolve({"data": "test"});
				};
			});
		};
		cache.plugins.push(plugin);

		setTimeout(() => finalize(), 50);

		const resA = await cache.fetch("test", func);
		const resB = await cache.fetch("test", func);
		const resC = await cache.fetch("test", func);

		expect(resA).toEqual("test");
		expect(resB).toEqual("test");
		expect(resC).toEqual("test");
	});

	it("Should not put on plugin if already exists in plugin", async () => {
		let finalize;
		const func = () => {
			return new Promise(() => {});
		};

		const plugin = new Plugin();
		plugin.tasks.get = async () => {
			return new Promise((resolve) => {
				finalize = () => {
					resolve({"data": "test"});
				};
			});
		};
		let timesPutCalled = 0;
		plugin.tasks.put = () => {
			timesPutCalled++;
		};
		cache.plugins.push(plugin);

		setTimeout(() => finalize(), 50);

		await cache.fetch("test", func);

		expect(timesPutCalled).toEqual(0);
	});

	it("Should only call retrieveFunction once after plugin", (done) => {
		let finalize;
		let count = 0;
		const func = () => {
			count++;
			return new Promise(() => {});
		};

		const plugin = new Plugin();
		plugin.tasks.get = async () => {
			return new Promise((resolve, reject) => {
				finalize = () => {
					reject();
				};
			});
		};
		cache.plugins.push(plugin);

		cache.fetch("test", func);
		cache.fetch("test", func);
		cache.fetch("test", func);

		setTimeout(() => {
			expect(count).toEqual(0);

			finalize();

			setTimeout(() => {
				expect(count).toEqual(1);

				done();
			}, 1);
		}, 1);
	});

	describe("ID Prefix", () => {
		beforeEach(() => cache.settings.idPrefix = "prefix_");
		afterEach(() => cache.settings.idPrefix = null);

		it("Should not include idPrefix in retrieveFunction argument", async () => {
			let calledID;
			await cache.fetch("test", async (id) => {
				calledID = id;
				return "Hello World";
			});

			expect(calledID).toEqual("test");
			expect(cache._.internalcache["prefix_test"].data).toEqual("Hello World");
		});
	});
});
