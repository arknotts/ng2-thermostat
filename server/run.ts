import * as http from 'http';
import * as socketIo from 'socket.io';

import { Configuration } from './src/api/configuration';
import { Thermostat } from './src/core/thermostat';

import { ThermostatServer } from './src/api/thermostatServer';
import { Scheduler } from './src/api/schedule';
import { MqttBridge } from './src/api/iotBridge';
import { ThermostatBuilder } from './src/api/thermostatBuilder';


Configuration.Load(`${__dirname}/thermostat.config.json`, (config) => {
	let server: ThermostatServer;
	let httpServer: http.Server;
    let io: SocketIO.Server;
	let thermostat: Thermostat;

	httpServer = http.createServer((req: any, res: any) => {
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(`<h1>Welcome to node-thermostat.</h1><h3>Connect via a web socket at ws://localhost:${this._port}`, 'utf-8');
	});

	httpServer.listen(config.server.port, () => {
	     console.log(`Socket listening on port ${config.server.port}`);
	});

	io = socketIo(httpServer);

	thermostat = new ThermostatBuilder(config.thermostat, config.pins).buildThermostat(config.server.type);

	if(config.server.type.toLowerCase() === 'rest') {
		let iotBridge = new MqttBridge(
						config.iotBridge.brokerUrl,
						config.iotBridge.username,
						config.iotBridge.password);
		let scheduler = new Scheduler(config.schedule);
		server = new ThermostatServer(io, thermostat, iotBridge, scheduler);
	}
	else if(config.server.type.toLowerCase() === 'sim') {
		server = new ThermostatServer(io, thermostat, null, null);
	}
	else {
		throw `Unknown thermostat type '${config.server.type}'`;
	}

	server.start();
});