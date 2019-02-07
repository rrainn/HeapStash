# HeapStash [![Build Status](https://travis-ci.org/rrainn/HeapStash.svg?branch=master)](https://travis-ci.org/rrainn/HeapStash) [![Coverage Status](https://coveralls.io/repos/github/rrainn/HeapStash/badge.svg?branch=master)](https://coveralls.io/github/rrainn/HeapStash?branch=master) [![Known Vulnerabilities](https://snyk.io/test/github/rrainn/HeapStash/badge.svg)](https://snyk.io/test/github/rrainn/HeapStash) [![Dependencies](https://david-dm.org/rrainn/HeapStash.svg)](https://david-dm.org/rrainn/HeapStash) [![Dev Dependencies](https://david-dm.org/rrainn/HeapStash/dev-status.svg)](https://david-dm.org/rrainn/HeapStash?type=dev) [![NPM version](https://badge.fury.io/js/HeapStash.svg)](http://badge.fury.io/js/HeapStash)

## General

HeapStash is a Node.js cache engine meant to make it easier to work with your data. It was built out of a need for a caching system to cache data from external sources. HeapStash has many great features such as TTL support, maximum memory cache item support, fetch support to run an async retrieve function and cache multiple times before getting the result, external cache support with plugins, and many more great features.

## Installation

```
$ npm i HeapStash
```

## Getting Started

```js
const HeapStash = require("HeapStash");
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

### cache.get(id)

This method allows you to retrieve an item from the cache for the given ID. This method will return the given object you requested, or undefined if the item does not exist in the cache.

This method returns a promise that will resolve with the cached item.

### cache.put(id, item)

This method allows you to put an item in the cache. This method will overwrite any existing item with the same ID in the cache.

This method returns a promise that will resolve when the item has been put in the cache.

### cache.remove(id)

This method allows you to remove an item from the cache. If the ID does not exist in the cache this method will fail silently.

This method returns a promise that will resolve when the item has been removed from the cache.

### cache.fetch(id, retrieveFunction)

This method allows you to get an item from the cache then fall back to a retrieveFunction if the item is not in the cache. If you call `cache.fetch` multiple times before the `retrieveFunction` has completed, it will only call the `retrieveFunction` once, and resolve all the promises after that one `retrieveFunction` has completed.

The `retrieveFunction` can either be a standard function, async function, or a function that returns a promise.

This method returns a promise that will resolve with the item with the data when available.

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

## Other Information

### debug

HeapStash has a lot of debug information that you can access by running the following command before running your Node.js script.

```
$ export DEBUG=HeapStash*
```

This will print a lot of useful information about the inner workings of HeapStash. It's recommended that you run this command if you are experiencing any problems related to HeapStash to help debug your code.
