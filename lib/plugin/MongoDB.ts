import Plugin from "./index";
import { MongoClient } from "mongodb";

interface MongoDBPluginSettings {
	client: MongoClient;
	db: string;
	collection: string;
}

export = async (settings: MongoDBPluginSettings): Promise<Plugin> => {
	const mongo = new Plugin();

	const collection = settings.client.db(settings.db).collection(settings.collection);
	await collection.createIndex({ "expireAt": 1 }, { "expireAfterSeconds": 0 });

	mongo.tasks.get = async (id: string): Promise<any> => {
		const result = await collection.findOne({ id });
		if (!result) {
			throw new Error("");
		} else {
			return result;
		}
	};
	mongo.tasks.put = async (id: string | string[], data: any): Promise<void> => {
		const updateObject: any = { "$set": data };

		if (data.ttl) {
			updateObject["$set"].expireAt = new Date(data.ttl);
			delete data.ttl;
		}

		function set (id: string) {
			return collection.updateOne({ id }, updateObject, {"upsert": true});
		}
		await Promise.all((Array.isArray(id) ? id : [id]).map(set));
	};
	mongo.tasks.remove = async (id: string): Promise<void> => {
		await collection.deleteOne({ id });
	};
	mongo.tasks.clear = async (): Promise<void> => {
		await collection.deleteMany({});
	};

	return mongo;
};
