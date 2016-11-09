import * as fs from 'fs';

import { IThermostatConfiguration, ThermostatConfiguration } from './src/core/configuration';
import { ThermostatMode } from '../common/thermostatMode';

import { BaseServer } from './src/api/baseServer';
import { RestServer } from './src/api/restServer';
import { SimServer } from './src/api/simServer';
import { ISchedule, Scheduler } from './src/api/schedule';
import { IBroadcaster, MqttBroadcaster } from './src/api/broadcaster';

fs.readFile(`${__dirname}/thermostat.config.json`, (err, data) => {
	if(err) throw err;

	let config = JSON.parse(<any>data);
	let thermostatConfig: any = config.thermostat;
	let serverConfig: any = config.server;
	let schedule: ISchedule = config.schedule;
	let broadcasterConfig: any = config.broadcaster;

	let configuration: IThermostatConfiguration = new ThermostatConfiguration(
		thermostatConfig.heatingTargetRange,
		thermostatConfig.coolingTargetRange,
		(<any>ThermostatMode)[thermostatConfig.defaultMode],
		thermostatConfig.maxOvershootTemp,
		thermostatConfig.maxRunTime,
		thermostatConfig.minDelayBetweenRuns,
		{
			TemperatureSensorPollDelay: thermostatConfig.tempSensorPollDelay
		},
		thermostatConfig.tempEmitDelay
	);

	let broadcaster: IBroadcaster = null;
	let server: BaseServer;

	if(broadcasterConfig.type == 'mqtt') {
		broadcaster = new MqttBroadcaster(broadcasterConfig.brokerUrl,
										  broadcasterConfig.username,
										  broadcasterConfig.password);
	}

	if(serverConfig.type.toLowerCase() == 'rest') {
		server = new RestServer(configuration, broadcaster, new Scheduler(schedule));
	}
	else if(serverConfig.type.toLowerCase() == 'sim') {
		server = new SimServer(configuration);
	}
	else {
		throw `Unknown server type \'${serverConfig.type}\' in configuration file.`;
	}

	server.start();
});


