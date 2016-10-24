import express = require('express');
import bodyParser = require('body-parser');

import { IThermostatEvent, ThermostatEventType, ThermostatTopic } from '../../../common/thermostatEvent';
import { ThermostatMode } from '../../../common/thermostatMode';

import { Thermostat } from '../core/thermostat';
import { IThermostatConfiguration, ITempSensorConfiguration } from '../core/configuration';
import { ITempReader } from '../core/tempReader';
import { ITempSensor } from '../core/tempSensor';
import { ITrigger } from '../core/trigger';

export abstract class BaseServer {

    app = require('http').createServer(this.httpHandler);
    io = require('socket.io')(this.app);
	router = require('socket.io-events')();
    
    thermostat: Thermostat;

    constructor(private _thermostatConfiguration: IThermostatConfiguration, private _port: number = 3000) {
		let tempReader = this.buildTempReader(this._thermostatConfiguration.TempSensorConfiguration);
		let furnaceTrigger: ITrigger = this.buildFurnaceTrigger();
		let acTrigger: ITrigger = this.buildAcTrigger();

		this.thermostat = new Thermostat(this._thermostatConfiguration, tempReader, furnaceTrigger, acTrigger);

		this.thermostat.eventStream.subscribe((e) => {
			this.io.sockets.send(e);
		});

		this.thermostat.start();
	}

    start() {
        this.preThermostatInitRoutes();
        this.postThermostatInitRoutes();
        this.listen();
    }

	abstract buildTempReader(tempSensorConfiguration: ITempSensorConfiguration): ITempReader;
	abstract buildFurnaceTrigger(): ITrigger;
	abstract buildAcTrigger(): ITrigger;

	httpHandler(req: any, res: any) {
		res.send('<h1>Welcome to node-thermostat.</h1><h3>Connect via a web socket at ws://localhost:' + this._port);
	}

	//TODO can remove?
    preThermostatInitRoutes() {
		this.router.use((socket: any, args: any, next: any) => {
			next();
        });
    }

    postThermostatInitRoutes() {
        this.router.on('/reset', (socket: any, args: any, next: any) => {
            this.reset();
        });

        this.router.on('/start', (socket: any, args: any, next: any) => {
            this.thermostat.start();
        });

        this.router.on('/target', (socket: any, args: any, next: any) => {
			let payload = args[1];
			if(payload) {
				if(payload.target) {
					this.thermostat.setTarget(payload.target);
				}
				else {
					next('Invalid set target call');
				}
			}
			else {
				socket.emit(args.shift(), { target: this.thermostat.target });
			}
        });

        this.router.on('/mode', (socket: any, args: any, next: any) => {
			let payload = args[1];
			if(payload) {
				if(payload.mode != null) {
					this.thermostat.setMode(<ThermostatMode>(payload.mode));
				}
				else {
					next('Invalid set mode call');
				}
			}
			else {
				socket.emit(args.shift(), { mode: this.thermostat.mode });
			}
        });

		this.router.on((err, socket, args, next) => {
			this.emitError(err);
		})
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
    
    listen() {
		this.io.use(this.router);

        this.app.listen(this._port, () => {
            console.log('Socket listening on port ' + this._port);
        });
    }

}