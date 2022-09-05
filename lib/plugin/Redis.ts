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
			return JSON.parse(result);
		} else {
			throw new Error();
		}
	};
	redis.tasks.put = async (id: string | string[], data: any): Promise<void> => {
		const dataStr: string = JSON.stringify(data);

		function set (id: string) {
			if (data.ttl) {
				return settings.client.set(id, dataStr, "EX", Math.round((Date.now() - data.ttl) / 1000));
			} else {
				return settings.client.set(id, dataStr);
			}
		}
		await Promise.all((Array.isArray(id) ? id : [id]).map(set));
	};
	redis.tasks.remove = async (id: string): Promise<void> => {
		await settings.client.del(id);
	};
	redis.tasks.clear = async (): Promise<void> => {
		await settings.client.flushdb();
	};

	return redis;
};
