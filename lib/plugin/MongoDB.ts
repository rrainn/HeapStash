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
	mongo.tasks.put = async (id: string, data: any): Promise<void> => {
		const updateObject: any = { "$set": data };

		if (data.ttl) {
			updateObject["$set"].expireAt = new Date(data.ttl);
			delete data.ttl;
		}

		await collection.updateOne({ id }, updateObject, {"upsert": true});
	};
	mongo.tasks.remove = async (id: string): Promise<void> => {
		await collection.deleteOne({ id });
	};
	mongo.tasks.clear = async (): Promise<void> => {
		await collection.deleteMany({});
	};

	return mongo;
};
