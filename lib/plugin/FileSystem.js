const fs = require("fs");
const path = require("path");
const Plugin = require("./");

module.exports = (settings) => {
	const filesystem = new Plugin();

	filesystem.tasks.get = (id) => {
		return new Promise((resolve, reject) => {
			fs.readFile(path.join(settings.path, id), "utf8", (err, data) => {
				if (data) {
					try {
						data = JSON.parse(data);
						resolve(data);
					} catch (e) {
						reject(e);
					}
				} else {
					reject();
				}
			});
		});
	};
	filesystem.tasks.put = (id, data) => {
		return new Promise((resolve, reject) => {
			fs.writeFile(path.join(settings.path, id), JSON.stringify(data), (err) => {
				/* istanbul ignore next */
				if (err) {
					reject();
				} else {
					resolve();
				}
			});
		});
	};
	filesystem.tasks.remove = (id) => {
		return new Promise((resolve, reject) => {
			fs.unlink(path.join(settings.path, id), (err) => {
				/* istanbul ignore next */
				if (err) {
					reject();
				} else {
					resolve();
				}
			});
		});
	};
	filesystem.tasks.clear = () => {
		return new Promise((resolve, reject) => {
			fs.readdir(path.join(settings.path), async (err, files) => {
				/* istanbul ignore next */
				if (err) {
					reject();
				}

				function deleteFilePromise(file) {
					return new Promise((resolve, reject) => {
						fs.unlink(path.join(settings.path, file), (err) => {
							/* istanbul ignore next */
							if (err) {
								reject();
							} else {
								resolve();
							}
						});
					});
				}

				try {
					await Promise.all(files.map((file) => deleteFilePromise(file)));
					resolve();
				} catch (e) {
					/* istanbul ignore next */
					reject();
				}
			});
		});
	};

	return filesystem;
};
