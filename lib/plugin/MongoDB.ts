import Plugin from "./index";
import { MongoClient } from "mongodb";

interface MongoDBPluginSettings {
	client: MongoClient;
	db: string;
	collection: string;
}

export = async (settings: MongoDBPluginSettings): Promise<Plugin> => {
	const mongo = new Plugin();

	mongo.tasks.get = (id: string): Promise<any> => {
		return new Promise<any>((resolve, reject) => {
			settings.client.db(settings.db).collection(settings.collection).findOne({ key: id }, (err, result) => {
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
			settings.client.db(settings.db).collection(settings.collection).updateOne({ "key": id }, { "$set": { "value": data } }, {"upsert": true}, (err, result) => {
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
			settings.client.db(settings.db).collection(settings.collection).deleteOne({ "key": id }, (err, result) => {
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
			settings.client.db(settings.db).collection(settings.collection).deleteMany({}, (err, result) => {
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
