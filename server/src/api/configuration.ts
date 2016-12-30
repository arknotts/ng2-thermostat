import * as fs from 'fs';

import { IThermostatConfiguration } from '../core/configuration';

export interface IServerConfiguration {
	port: number;
	type: string;
}

export interface IBroadcasterConfiguration {
	type: string;
	brokerUrl: string;
	username: string;
	password: string;
}

export interface IScheduleItem {
	time: string;
	temperature: number;
}

export interface IScheduleConfiguration {
	timezone: string;
	weekdays: Array<IScheduleItem>;
	weekends: Array<IScheduleItem>;
}

export interface IPinConfiguration {
	tempSensor: number;
	furnaceTrigger: number;
}

export interface IConfiguration {
	server: IServerConfiguration;
	pins: IPinConfiguration;
	thermostat: IThermostatConfiguration;
	broadcaster: IBroadcasterConfiguration;
	schedule: IScheduleConfiguration;
}

export class Configuration {
	static Load(filePath: string, onLoad: {(configuration: IConfiguration)}) {
		fs.readFile(filePath, (err, data) => {
			if(err) {
				throw err;
			} 

			let configuration: IConfiguration = JSON.parse(<any>data);
			onLoad(configuration);
		});
	}
}