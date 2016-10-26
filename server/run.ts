import * as fs from 'fs';

import { IThermostatConfiguration, ThermostatConfiguration } from './src/core/configuration';
import { ThermostatMode } from '../common/thermostatMode';

import { BaseServer } from './src/api/baseServer';
import { RestServer } from './src/api/restServer';
import { SimServer } from './src/api/simServer';

fs.readFile(`${__dirname}/thermostat.config.json`, (err, data) => {
	if(err) throw err;

	let config = JSON.parse(<any>data);
	let thermostatConfig = config.thermostat;
	let serverConfig = config.server;

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

	let server: BaseServer;

	if(serverConfig.type.toLowerCase() == 'rest') {
		server = new RestServer(configuration);
	}
	else if(serverConfig.type.toLowerCase() == 'sim') {
		server = new SimServer(configuration);
	}
	else {
		throw `Unknown server type \'${serverConfig.type}\' in configuration file.`;
	}

	server.start();
});


