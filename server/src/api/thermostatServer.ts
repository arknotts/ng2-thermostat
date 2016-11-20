import { IThermostatEvent, ThermostatEventType, ThermostatTopic } from '../../../common/thermostatEvent';
import { ThermostatMode } from '../../../common/thermostatMode';

import { IThermostat } from '../core/thermostat';

import { IBroadcaster } from './broadcaster';
import { IScheduler } from './schedule';

export class ThermostatServer {

	private lastTemperature: number; //TODO read directly from stream, this is a hack

    constructor(protected _io: SocketIO.Server,
				protected _thermostat: IThermostat,
				protected _broadcaster: IBroadcaster = null,
				protected _scheduler: IScheduler = null) {

		this._io.on('connection', (socket) => {
        	this.setupRoutes(socket);
		});
	}

    start() {
		this._thermostat.eventStream.subscribe((e) => {
			//send thermostat events to all clients connected via sockets
			this._io.sockets.send(e);

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

		this._thermostat.start();

		if(this._scheduler) {
			this._scheduler.initSchedule((temperature) => {
				this._thermostat.setTarget(temperature);
			});
		}

		console.log('Server started!');
    }

    private setupRoutes(socket: SocketIO.Socket) {

		//emit "welcome" events to init client quickly
		this.emitEvent(socket, ThermostatTopic.Target, this._thermostat.target.toString());
		if(this.lastTemperature) {
			this.emitEvent(socket, ThermostatTopic.Temperature, this.lastTemperature.toString());
		}

		socket.on('/reset', () => {
			this.reset();
		});

		socket.on('/start', () => {
			this._thermostat.start();
		});

		socket.on('/target', (data: any) => {
			if(data) {
				if(data.target) {
					this._thermostat.setTarget(data.target);
				}
				else {
					this.emitError('Invalid set target call');
				}
			}
			else {
				socket.emit('/target', { target: this._thermostat.target });
			}
		});

		socket.on('/mode', (data: any) => {
			if(data) {
				if(data.mode != null) {
					this._thermostat.setMode(<ThermostatMode>(data.mode));
				}
				else {
					this.emitError('Invalid set mode call');
				}
			}
			else {
				socket.emit('/mode', { mode: this._thermostat.mode });
			}
		});
        
    }

	private emitEvent(socket: SocketIO.Socket, topic: string[], message: string) {
		socket.send(<IThermostatEvent>{
			type: ThermostatEventType.Message,
			topic: topic,
			message: message,
		});
	}
	
	private emitError(error: string) {
		this._io.sockets.send(<IThermostatEvent>{
			type: ThermostatEventType.Error,
			topic: ThermostatTopic.Error,
			message: error,
		});
	}

    private reset() {
		this._thermostat.stop();
		this._thermostat.start();
    }

}