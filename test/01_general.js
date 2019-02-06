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

	describe("fetch()", () => {
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

		it("Should add resolve and reject methods to array if pending action", async () => {
			let counter = 0;
			const func = () => {
				counter++;
				return new Promise(() => {});
			};
			cache.fetch("test", func);
			cache.fetch("test", func);

			expect(cache._.inprogressfetchpromises["test"]).to.be.an("array");
			expect(cache._.inprogressfetchpromises["test"].length).to.eql(1);
			expect(cache._.inprogressfetchpromises["test"][0].resolve).to.be.a("function");
			expect(cache._.inprogressfetchpromises["test"][0].reject).to.be.a("function");
			expect(counter).to.eql(1);
		});

		it("Should call resolve on other promise after resolved", async () => {
			let finalize;
			const func = () => {
				return new Promise((resolve) => {
					finalize = () => {
						resolve({"data": "test"});
					};
				});
			};
			cache.fetch("test", func);
			finalize();
			const res = await cache.fetch("test", func);

			expect(res).to.eql({"data": "test"});
			expect(cache._.inprogressfetchpromises).to.eql({});
		});

		it("Should call reject on other promise after resolved", async () => {
			let finalize, res, error;
			const func = () => {
				return new Promise((resolve, reject) => {
					finalize = () => {
						reject(new Error("Error"));
					};
				});
			};

			cache.fetch("test", func).catch(() => {});
			finalize();

			try {
				res = await cache.fetch("test", func);
			} catch (e) {
				error = e;
			}

			expect(error.message).to.eql("Error");
			expect(res).to.not.exist;
			expect(cache._.inprogressfetchpromises).to.eql({});
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
