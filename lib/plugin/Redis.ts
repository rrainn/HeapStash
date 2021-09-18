import Plugin from "./index";
import * as Redis from "ioredis";

interface RedisPluginSettings {
	client: Redis.Redis;
}

export = (settings: RedisPluginSettings): Plugin => {
	const redis = new Plugin();

	redis.tasks.get = async (id: string): Promise<any> => {
		const result = await settings.client.get(id);
		if (result) {
			try {
				return JSON.parse(result);
			} catch (e) {
				return result;
			}
		} else {
			throw new Error();
		}
	};
	redis.tasks.put = async (id: string, data: any): Promise<void> => {
		let dataStr: string;
		if (typeof data === "object") {
			dataStr = JSON.stringify(data);
		} else {
			dataStr = data;
		}

		if (data.ttl) {
			await settings.client.set(id, dataStr, "EX", Math.round((Date.now() - data.ttl) / 1000));
		} else {
			await settings.client.set(id, dataStr);
		}
	};
	redis.tasks.remove = async (id: string): Promise<void> => {
		await settings.client.del(id);
	};
	redis.tasks.clear = async (): Promise<void> => {
		await settings.client.flushdb();
	};

	return redis;
};
