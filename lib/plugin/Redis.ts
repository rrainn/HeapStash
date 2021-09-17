import { Plugin } from "./index";
import * as Redis from "ioredis";

interface RedisPluginSettings {
	client: Redis.Redis;
}

module.exports = async (settings: RedisPluginSettings): Promise<Plugin> => {
	const redis = new Plugin();

	redis.tasks.get = (id: string): Promise<any> => {
		return new Promise<any>((resolve, reject) => {
			settings.client.get(id, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result ? JSON.parse(result) : null);
				}
			});
		});
	};
	redis.tasks.put = (id: string, data: any): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			settings.client.set(id, JSON.stringify(data), (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	};
	redis.tasks.remove = (id: string): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			settings.client.del(id, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	};
	redis.tasks.clear = (): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			settings.client.flushdb((err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	};

	return redis;
};
