export class Plugin {
	tasks: any;
	_: any;

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

import * as DynamoDB from "./DynamoDB";
import * as FileSystem from "./FileSystem";

export {
	DynamoDB,
	FileSystem
};
