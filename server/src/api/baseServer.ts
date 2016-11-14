import * as http from 'http';
import * as socketIo from 'socket.io';

import { IThermostatEvent, ThermostatEventType, ThermostatTopic } from '../../../common/thermostatEvent';
import { ThermostatMode } from '../../../common/thermostatMode';

import { Thermostat } from '../core/thermostat';
import { IThermostatConfiguration, ITempSensorConfiguration } from '../core/configuration';
import { ITempReader } from '../core/tempReader';
import { ITrigger } from '../core/trigger';

import { IBroadcaster } from './broadcaster';
import { Scheduler } from './schedule';

export abstract class BaseServer {

    app: http.Server;
    io: SocketIO.Server;
    
    thermostat: Thermostat;
	lastTemperature: number; //TODO read directly from stream, this is a hack

    constructor(private _thermostatConfiguration: IThermostatConfiguration, 
				private _broadcaster: IBroadcaster,
				private _scheduler: Scheduler, 
				private _port: number = 3000) {
		this.app = http.createServer(this.httpHandler);
		this.io = socketIo(this.app);

		this.io.on('connection', (socket) => {
        	this.setupRoutes(socket);
		});

		let tempReader = this.buildTempReader(this._thermostatConfiguration.TempSensorConfiguration);
		let furnaceTrigger: ITrigger = this.buildFurnaceTrigger();
		let acTrigger: ITrigger = this.buildAcTrigger();

		this.thermostat = new Thermostat(this._thermostatConfiguration, tempReader, furnaceTrigger, acTrigger);
	}

    start() {
		this.thermostat.eventStream.subscribe((e) => {
			//send thermostat events to all clients connected via sockets
			this.io.sockets.send(e);

			//broadcast events over the network
			if(this._broadcaster) {
				this._broadcaster.broadcast(e);
			}

			//TODO this is a hack...
			if(e.topic == ThermostatTopic.Temperature) {
				this.lastTemperature = parseFloat(e.message);
			}
		});

		if(this._broadcaster) {
			this._broadcaster.connect();
		}

        this.app.listen(this._port, () => {
            console.log('Socket listening on port ' + this._port);
        });

		this.thermostat.start();

		this._scheduler.initSchedule((temperature) => {
			this.thermostat.setTarget(temperature);
		});
    }

	abstract buildTempReader(tempSensorConfiguration: ITempSensorConfiguration): ITempReader;
	abstract buildFurnaceTrigger(): ITrigger;
	abstract buildAcTrigger(): ITrigger;

	httpHandler(req: any, res: any) {
		res.send('<h1>Welcome to node-thermostat.</h1><h3>Connect via a web socket at ws://localhost:' + this._port);
	}

    setupRoutes(socket: SocketIO.Socket) {

		//emit "welcome" events to init client quickly
		this.emitEvent(socket, ThermostatTopic.Target, this.thermostat.target.toString());
		if(this.lastTemperature) {
			this.emitEvent(socket, ThermostatTopic.Temperature, this.lastTemperature.toString());
		}

		socket.on('/reset', () => {
			this.reset();
		});

		socket.on('/start', () => {
			this.thermostat.start();
		});

		socket.on('/target', (data: any) => {
			if(data) {
				if(data.target) {
					this.thermostat.setTarget(data.target);
				}
				else {
					this.emitError('Invalid set target call');
				}
			}
			else {
				socket.emit('/target', { target: this.thermostat.target });
			}
		});

		socket.on('/mode', (data: any) => {
			if(data) {
				if(data.mode != null) {
					this.thermostat.setMode(<ThermostatMode>(data.mode));
				}
				else {
					this.emitError('Invalid set mode call');
				}
			}
			else {
				socket.emit('/mode', { mode: this.thermostat.mode });
			}
		});
        
    }

	emitEvent(socket: SocketIO.Socket, topic: string[], message: string) {
		socket.send(<IThermostatEvent>{
			type: ThermostatEventType.Message,
			topic: topic,
			message: message,
		});
	}
	
	emitError(error: string) {
		this.io.sockets.send(<IThermostatEvent>{
			type: ThermostatEventType.Error,
			topic: ThermostatTopic.Error,
			message: error,
		});
	}

    reset() {
		this.thermostat.stop();
		this.thermostat.start();
    }

}