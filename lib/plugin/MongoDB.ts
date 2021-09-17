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

	mongo.tasks.get = (id: string): Promise<any> => {
		return new Promise<any>((resolve, reject) => {
			collection.findOne({ key: id }, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result.value);
				}
			});
		});
	};
	mongo.tasks.put = (id: string, data: any): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			const updateObject: any = { "$set": { "value": data } };

			if (data.ttl) {
				updateObject.expireAt = new Date(data.ttl);
			}

			collection.updateOne({ "key": id }, updateObject, {"upsert": true}, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	};
	mongo.tasks.remove = (id: string): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			collection.deleteOne({ "key": id }, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	};
	mongo.tasks.clear = (): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			collection.deleteMany({}, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	};

	return mongo;
};
