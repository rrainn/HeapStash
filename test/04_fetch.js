const HeapStash = require("../");
const {expect} = require("chai");

describe("fetch()", () => {
	let cache;
	beforeEach(() => cache = new HeapStash());

	it("Should be a function", () => {
		expect(cache.fetch).to.be.a("function");
	});

	it("Should throw error if no ID passed in", () => {
		expect(cache.fetch).to.throw("ID required to fetch item.");
	});

	it("Should throw error if no retrieveFunction passed in", () => {
		expect(() => cache.fetch("test")).to.throw("Retrieve function required to fetch item.");
	});

	it("Should return a promise", () => {
		expect(cache.fetch("test", () => ({"data": "test"}))).to.be.a("promise");
	});

	it("Should return item from cache if exists", async () => {
		cache.put("test", {"result": "data"});
		const res = await cache.fetch("test", () => ({"result": "data"}));

		expect(res).to.eql({"result": "data"});
	});

	it("Should call retrieveFunction if not in cache and not currently retrieving", async () => {
		let calledRetrieveFunction = false;
		let cacheinprogressfetchpromises;
		const res = await cache.fetch("test", async () => {
			calledRetrieveFunction = true;
			cacheinprogressfetchpromises = {...cache._.inprogressfetchpromises};
			return {"result": "data"};
		});

		expect(calledRetrieveFunction).to.be.true;
		expect(cacheinprogressfetchpromises).to.eql({"test": []});
		expect(res).to.eql({"result": "data"});
		expect(cache._.inprogressfetchpromises).to.eql({});
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

		expect(calledRetrieveFunction).to.be.true;
		expect(cacheinprogressfetchpromises).to.eql({"test": []});
		expect(res).to.not.exist;
		expect(error.message).to.eql("Error");
		expect(cache._.inprogressfetchpromises).to.eql({});
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
			expect(cache._.inprogressfetchpromises["test"]).to.be.an("array");
			expect(cache._.inprogressfetchpromises["test"].length).to.eql(1);
			expect(cache._.inprogressfetchpromises["test"][0].resolve).to.be.a("function");
			expect(cache._.inprogressfetchpromises["test"][0].reject).to.be.a("function");
			expect(counter).to.eql(1);

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

			expect(res).to.eql({"data": "test"});
			expect(cache._.inprogressfetchpromises).to.eql({});

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

		cache.fetch("test", func).catch(() => {});

		setTimeout(async () => {
			finalize();

			try {
				res = await cache.fetch("test", func);
			} catch (e) {
				error = e;
			}

			expect(error.message).to.eql("Error");
			expect(res).to.not.exist;
			expect(cache._.inprogressfetchpromises).to.eql({});

			done();
		}, 1);
	});

	it("Should only call plugin once", (done) => {
		let finalize, res, error;
		const func = () => {
			return new Promise((resolve, reject) => {});
		};

		let count = 0;
		const plugin = new HeapStash.Plugin();
		plugin.tasks.get = async () => {
			count++;

			return new Promise((resolve) => {
				finalize = () => {
					resolve({"data": "test"});
				};
			});
		};
		cache.plugins.push(plugin);

		cache.fetch("test", func);
		cache.fetch("test", func);
		cache.fetch("test", func);

		setTimeout(async () => {
			expect(count).to.eql(1);

			done();
		}, 1);
	});

	it("Should only call plugin once and resolve correctly", async () => {
		let finalize, res, error;
		const func = () => {
			return new Promise((resolve, reject) => {});
		};

		let count = 0;
		const plugin = new HeapStash.Plugin();
		plugin.tasks.get = async () => {
			count++;

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

		expect(resA).to.eql("test");
		expect(resB).to.eql("test");
		expect(resC).to.eql("test");
	});

	it("Should only call retrieveFunction once after plugin", (done) => {
		let finalize, res, error;
		let count = 0;
		const func = () => {
			count++;
			return new Promise((resolve, reject) => {});
		};

		const plugin = new HeapStash.Plugin();
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
			expect(count).to.eql(0);

			finalize();

			setTimeout(() => {
				expect(count).to.eql(1);

				done();
			}, 1);
		}, 1);
	});
});