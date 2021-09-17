import Plugin from "./index";
import * as Redis from "ioredis";

interface RedisPluginSettings {
	client: Redis.Redis;
}

export = (settings: RedisPluginSettings): Plugin => {
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
			const callback = (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			};

			if (data.ttl) {
				settings.client.set(id, JSON.stringify(data), "EX", Math.round(data.ttl / 1000), callback);
			} else {
				settings.client.set(id, JSON.stringify(data), callback);
			}
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
