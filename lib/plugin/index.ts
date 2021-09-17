class Plugin {
	tasks: any;
	_: any;
	static DynamoDB: any;
	static FileSystem: any;
	static MongoDB: any;
	static Redis: any;

	constructor () {
		this.tasks = {};
	}

	run (name: string) {
		const self = this;
		return function () {
			if (self.tasks[name]) {
				return self.tasks[name](...arguments);
			}
		};
	}
}

export = Plugin;
