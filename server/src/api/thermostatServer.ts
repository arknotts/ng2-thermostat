import { IThermostatEvent, ThermostatEventType, THERMOSTAT_TOPIC } from '../../../common/thermostatEvent';
import { ThermostatMode } from '../../../common/thermostatMode';

import { IThermostat } from '../core/thermostat';

import { IIoTBridge } from './iotBridge';
import { IScheduler } from './schedule';

export class ThermostatServer {

	private lastTemperatureMessage: any; //TODO read directly from stream, this is a hack

    constructor(protected _io: SocketIO.Server,
				protected _thermostat: IThermostat,
				protected _iotBridge: IIoTBridge = null,
				protected _scheduler: IScheduler = null) {

		this._io.on('connection', (socket) => {
        	this.setupRoutes(socket);
		});
	}

    start() {
		this._thermostat.eventStream.subscribe((event: IThermostatEvent) => {
			//send thermostat events to all clients connected via sockets
			this._io.sockets.send(event);

			//broadcast events over the network
			if(this._iotBridge) {
				let message: any = this.buildMessageFromEvent(event);
				this._iotBridge.broadcast(event.topic, message);
			}

			//TODO this is a hack...
			if(event.topic === THERMOSTAT_TOPIC.Temperature) {
				this.lastTemperatureMessage = event.message;
			}
		});

		if(this._iotBridge) {
			this._iotBridge.connect();
			this._iotBridge.events$.subscribe(
				(thermostatEvent) => this.handleInboundEvent(thermostatEvent)
			);
		}

		this._thermostat.start();

		if(this._scheduler) {
			this._scheduler.initSchedule((temperature) => {
				this._thermostat.setTarget(temperature);
			});
		}

		console.log('Server started!');
    }

	private buildMessageFromEvent(event: IThermostatEvent): any {
		if(event.topic == THERMOSTAT_TOPIC.Temperature) {
			return event.message;
		}
		else if(event.topic == THERMOSTAT_TOPIC.Target) {
			return {
				target: parseInt(event.message)
			};
		}
		else if(event.topic == THERMOSTAT_TOPIC.Mode) {
			return {
				mode: event.message
			};
		}
		else if(event.topic == THERMOSTAT_TOPIC.Status) {
			return {
				status: event.message
			};
		}
		else if(event.topic == THERMOSTAT_TOPIC.Furnace) {
			return {
				action: event.message
			};
		}
		else if(event.topic == THERMOSTAT_TOPIC.Fan) {
			return {
				fan: event.message
			};
		}
		else if(event.topic == THERMOSTAT_TOPIC.Ac) {
			return {
				action: event.message
			};
		}
		else if(event.topic == THERMOSTAT_TOPIC.Error) {
			return {
				error: event.message
			};
		}

		return null;
	}

    private setupRoutes(socket: SocketIO.Socket) {

		//emit "welcome" events to init client quickly
		this.emitEvent(socket, THERMOSTAT_TOPIC.Target, this._thermostat.target.toString());
		if(this.lastTemperatureMessage) {
			this.emitEvent(socket, THERMOSTAT_TOPIC.Temperature, this.lastTemperatureMessage);
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
				if(data.mode !== null) {
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
        
		socket.on('/fan', (data: string) => {
			if(data) {
				if(data === 'start') {
					this._thermostat.startFan();
				}
				else {
					this._thermostat.stopFan();
				}
			}
		});
    }

	private handleInboundEvent(thermostatEvent: IThermostatEvent) {
		if(thermostatEvent.topic == THERMOSTAT_TOPIC.TargetSet) {
			this._thermostat.setTarget(parseInt(thermostatEvent.message.target));
		}
		else if(thermostatEvent.topic == THERMOSTAT_TOPIC.ModeSet) {
			this._thermostat.setMode(ThermostatMode[<string>thermostatEvent.message.mode]);
		}
		else if(thermostatEvent.topic == THERMOSTAT_TOPIC.FanSet) {
			if(thermostatEvent.message.fan === 'start') {
				this._thermostat.startFan();
			}
			else {
				this._thermostat.stopFan();
			}
		}
	}

	private emitEvent(socket: SocketIO.Socket, topic: string, message: any) {
		socket.send(<IThermostatEvent>{
			type: ThermostatEventType.Message,
			topic: topic,
			message: message,
		});
	}
	
	private emitError(error: string) {
		this._io.sockets.send(<IThermostatEvent>{
			type: ThermostatEventType.Error,
			topic: THERMOSTAT_TOPIC.Error,
			message: error,
		});
	}

    private reset() {
		this._thermostat.stop();
		this._thermostat.start();
    }

}