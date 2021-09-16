// import { Plugin } from "./index";

// module.exports = (settings) => {
// 	const mongo = new Plugin();

// 	mongo.tasks.get = (id: string): Promise<any> => {
// 		// return new Promise<any>((resolve, reject) => {
// 		// 	fs.readFile(path.join(settings.path, id), "utf8", (err, data) => {
// 		// 		if (data) {
// 		// 			try {
// 		// 				data = JSON.parse(data);
// 		// 				resolve(data);
// 		// 			} catch (e) {
// 		// 				reject(e);
// 		// 			}
// 		// 		} else {
// 		// 			reject();
// 		// 		}
// 		// 	});
// 		// });
// 	};
// 	mongo.tasks.put = (id: string, data: any): Promise<void> => {
// 		// return new Promise<void>((resolve, reject) => {
// 		// 	fs.writeFile(path.join(settings.path, id), JSON.stringify(data), (err) => {
// 		// 		/* istanbul ignore next */
// 		// 		if (err) {
// 		// 			reject();
// 		// 		} else {
// 		// 			resolve();
// 		// 		}
// 		// 	});
// 		// });
// 	};
// 	filesystem.tasks.remove = (id: string): Promise<void> => {
// 		// return new Promise<void>((resolve, reject) => {
// 		// 	fs.unlink(path.join(settings.path, id), (err) => {
// 		// 		/* istanbul ignore next */
// 		// 		if (err) {
// 		// 			reject();
// 		// 		} else {
// 		// 			resolve();
// 		// 		}
// 		// 	});
// 		// });
// 	};
// 	mongo.tasks.clear = (): Promise<void> => {
// 		// return new Promise<void>((resolve, reject) => {
// 		// 	fs.readdir(path.join(settings.path), async (err, files: string[]) => {
// 		// 		/* istanbul ignore next */
// 		// 		if (err) {
// 		// 			reject();
// 		// 		}

// 		// 		function deleteFilePromise(file: string): Promise<void> {
// 		// 			return new Promise<void>((resolve, reject) => {
// 		// 				fs.unlink(path.join(settings.path, file), (err) => {
// 		// 					/* istanbul ignore next */
// 		// 					if (err) {
// 		// 						reject();
// 		// 					} else {
// 		// 						resolve();
// 		// 					}
// 		// 				});
// 		// 			});
// 		// 		}

// 		// 		try {
// 		// 			await Promise.all(files.map((file: string) => deleteFilePromise(file)));
// 		// 			resolve();
// 		// 		} catch (e) {
// 		// 			/* istanbul ignore next */
// 		// 			reject();
// 		// 		}
// 		// 	});
// 		// });
// 	};

// 	return mongo;
// };
