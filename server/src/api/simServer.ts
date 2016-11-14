import fs = require('fs');
import path = require('path');
import * as socketIo from 'socket.io';

import { BaseServer } from './baseServer';
import { IThermostatConfiguration, ITempSensorConfiguration } from '../core/configuration';
import { ITempReader, MovingAverageTempReader } from '../core/tempReader';
import { ITrigger } from '../core/trigger';

import { SimTempSensor } from '../sim/simTempSensor';
import { SimTrigger } from '../sim/simTrigger';

export class SimServer extends BaseServer {
    private _simTempSensor: SimTempSensor;

	constructor(configuration: IThermostatConfiguration, io: SocketIO.Server) {
		super(configuration, io)
	}

	httpHandler(req: any, res: any) {
		fs.readFile(path.join(__dirname+'/bootstrapper.html'), function(error, content) {
			if (error) {
				res.writeHead(500);
				res.end();
			}
			else {
				res.writeHead(200, { 'Content-Type': 'text/html' });
				res.end(content, 'utf-8');
			}
		});
	}

    setupRoutes(socket: SocketIO.Socket) {
        super.setupRoutes(socket);

		socket.on('/tempChangePerSecond', (data: any) => {
			if(data && data.tempChangePerSecond) {
				let tempChange = parseFloat(data.tempChangePerSecond);
            	this._simTempSensor.tempChangePerSecond = tempChange;
			}
			else {
				this.emitError('Invalid temp change per second call');
			}
		});
    }

    buildTempReader(tempSensorConfiguration: ITempSensorConfiguration): ITempReader {
        this._simTempSensor = new SimTempSensor(tempSensorConfiguration, -.2, 70);
        return new MovingAverageTempReader(this._simTempSensor, 3);
    }

	buildFurnaceTrigger(): ITrigger {
        return new SimTrigger(this._io, this._simTempSensor);
    }

    buildAcTrigger(): ITrigger {
        return new SimTrigger(this._io, this._simTempSensor);
    }
}