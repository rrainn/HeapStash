# HeapStash ![Node.js CI](https://github.com/rrainn/HeapStash/workflows/Node.js%20CI/badge.svg) [![Coverage Status](https://coveralls.io/repos/github/rrainn/HeapStash/badge.svg?branch=main)](https://coveralls.io/github/rrainn/HeapStash?branch=main) [![Known Vulnerabilities](https://snyk.io/test/github/rrainn/HeapStash/badge.svg)](https://snyk.io/test/github/rrainn/HeapStash) [![Dependencies](https://david-dm.org/rrainn/HeapStash.svg)](https://david-dm.org/rrainn/HeapStash) [![Dev Dependencies](https://david-dm.org/rrainn/HeapStash/dev-status.svg)](https://david-dm.org/rrainn/HeapStash?type=dev) [![NPM version](https://badge.fury.io/js/heapstash.svg)](http://badge.fury.io/js/heapstash)

## General

HeapStash is a Node.js cache engine meant to make it easier to work with your data. It was built out of a need for a caching system to cache data from external sources. HeapStash has many great features such as TTL support, maximum memory cache item support, fetch support to run an async retrieve function and cache multiple times before getting the result, external cache support with plugins, and many more great features.

## Installation

```
$ npm i heapstash
```

## Getting Started

```js
const HeapStash = require("heapstash");
const cache = new HeapStash();
```

## API Documentation

### new HeapStash([settings])

The HeapStash constructor lets you create a cache object. It accepts a settings object as a parameter.

`settings` Object Properties:

- `ttl`: Time to Live for all items in the cache (in milliseconds)
- `idPrefix`: The prefix to be used for all ID's related to this cache instance
- `maxItems`: The maximum number of items to be stored in the internal cache

You can also edit the `settings` at any time by adjusting the `cache.settings` object.

### cache.get(id[, settings])

This method allows you to retrieve an item from the cache for the given ID. This method will return the given object you requested, or undefined if the item does not exist in the cache. The settings parameter is an optional object that you can pass in with a `internalCacheOnly` property that if set to true, won't call the get method on the plugins.

This method returns a promise that will resolve with the cached item.

### cache.put(id, item[, settings])

This method allows you to put an item in the cache. This method will overwrite any existing item with the same ID in the cache. The settings parameter is an optional object that you can pass in with a `internalCacheOnly` property that if set to true, won't call the put method on the plugins. The settings object also accepts a `ttl` property to overwrite the default cache TTL with a custom one for that item you are putting in the cache. If the `ttl` property is set to `false` the object will never expire and have no `ttl`, overwriting any `ttl` setting on the cache itself. You can also set a `pluginTTL` property to overwrite the TTL for the plugins only.

This method returns a promise that will resolve when the item has been put in the cache.

### cache.remove(id[, settings])

This method allows you to remove an item from the cache. If the ID does not exist in the cache this method will fail silently. The settings parameter is an optional object that you can pass in with a `internalCacheOnly` property that if set to true, won't call the remove method on the plugins.

This method returns a promise that will resolve when the item has been removed from the cache.

### cache.clear([settings])

This method allows you to clear all the items from the cache. The settings parameter is an optional object that you can pass in with a `internalCacheOnly` property that if set to true, won't call the clear method on the plugins.

This method returns a promise that will resolve when the items have been cleared from the cache.

### cache.fetch(id[, settings], retrieveFunction)

This method allows you to get an item from the cache then fall back to a retrieveFunction if the item is not in the cache. If you call `cache.fetch` multiple times before the `retrieveFunction` has completed, it will only call the `retrieveFunction` once, and resolve all the promises after that one `retrieveFunction` has completed.

The `retrieveFunction` can either be a standard function, async function, or a function that returns a promise. The `id` will be passed into the `retrieveFunction` as the first parameter. Although it will use the `idPrefix` for caching purposes, the `idPrefix` will not be attached to the argument passed into the `retrieveFunction`.

The settings parameter is an optional object that you can pass in with a `internalCacheOnly` property that if set to true, won't call the put or get methods on the plugins. The settings object also accepts a `ttl` property to overwrite the default cache TTL with a custom one for that item you are putting in the cache. If the `ttl` property is set to `false` the object will never expire and have no `ttl`, overwriting any `ttl` setting on the cache itself.

This method returns a promise that will resolve with the item with the data when available.

**Example**

```js
function getURL(urlToRetrieve) {
	return cache.fetch(urlToRetrieve, async (url) => {
		// `urlToRetrieve` will be passed in as the `url` parameter
		return (await axios(url)).data;
	});
}

// In the following example an Axios (network request) request will only be made once, and `a` and `b` will equal each other
const a = await getURL("https://rrainn.com");
const b = await getURL("https://rrainn.com");
const itemsEqual = a === b; // true

// In the following example an Axios (network request) request will only be made twice (since IDs are different and not stored in cache), and `c` and `d` will NOT equal each other
const c = await getURL("https://cclipss.com");
const d = await getURL("https://faxdeliver.com");
const secondItemsEqual = c === d; // false
```

### cache.plugins

This is an array that represents the secondary caches that you wish to use. This can be useful if you want to use a FileSystem, DynamoDB, or other type of fallback cache in addition to the in memory cache. All of these items must be instances of `HeapStash.Plugin`.

### new HeapStash.Plugin

This is a constructor to build a custom plugin for HeapStash. You must set functions to be run on the `plugin.tasks` property for each of the methods you want to listen for. You can view how to create a plugin by looking at the `lib/plugin/FileSystem.js` example.

### HeapStash.Plugin.FileSystem(settings)

This method returns a plugin instance of the File System plugin. You must pass in `settings` as an object, with a `path` property representing a folder you want to use for your file system cache.

```js
const fsCache = HeapStash.Plugin.FileSystem({"path": path.join(__dirname, "cache", "filesystem")});
cache.plugins.push(fsCache);
```

### HeapStash.Plugin.DynamoDB(settings)

This method returns a plugin instance of the DynamoDB plugin. You must pass in `settings` as an object with the following properties:

- `tableName` - The name of the DynamoDB table you wish to use
- `dynamodb` (optional, default: `new AWS.DynamoDB()`) - The `AWS.DynamoDB` instance you wish to use
- `primaryKey` (optional, default: `id`) - The primary key for the table that we will use to store the ID
- `ttlAttribute` (optional, default: `ttl`) - The TTL attribute for DynamoDB

You must create your DynamoDB table prior to using this plugin.

### HeapStash.Plugin.MongoDB(settings)

This method returns a plugin instance of the MongoDB plugin. You must pass in `settings` as an object with the following properties:

- `client` - The MongoDB client
- `db` - The database you wish to connect to
- `collection` - The name of the collection you wish to use

You must run `client.connect` and `client.disconnect` yourself when using this plugin.

### HeapStash.Plugin.Redis(settings)

This method returns a plugin instance of the Redis plugin. You must pass in `settings` as an object with the following properties:

- `client` - The Redis client

You must run `client.connect` and `client.disconnect` yourself when using this plugin.

## Other Information

### debug

HeapStash has a lot of debug information that you can access by running the following command before running your Node.js script.

```
$ export DEBUG=HeapStash*
```

This will print a lot of useful information about the inner workings of HeapStash. It's recommended that you run this command if you are experiencing any problems related to HeapStash to help debug your code.
