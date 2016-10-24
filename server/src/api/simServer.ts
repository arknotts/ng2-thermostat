import fs = require('fs');
import path = require('path');

import { ThermostatMode } from '../../../common/thermostatMode';

import { BaseServer } from './baseServer';
import { IThermostatConfiguration, ITempSensorConfiguration } from '../core/configuration';
import { ITempReader, MovingAverageTempReader } from '../core/tempReader';
import { ITempSensor } from '../core/tempSensor';
import { ITrigger } from '../core/trigger';

import { SimTempSensor } from '../sim/simTempSensor';
import { SimTrigger } from '../sim/simTrigger';

export class SimServer extends BaseServer {
    private _simTempSensor: SimTempSensor;

	constructor(configuration: IThermostatConfiguration) {
		super(configuration)
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

    postThermostatInitRoutes() {
        super.postThermostatInitRoutes();

		this.router.on('/tempChangePerSecond', (socket: any, args: any, next: any) => {
			if(args[1] && args[1].tempChangePerSecond) {
				let tempChange = parseFloat(args[1].tempChangePerSecond);
            	this._simTempSensor.tempChangePerSecond = tempChange;
			}
			else {
				next('Invalid temp change per second call');
			}
		});
    }

    buildTempReader(tempSensorConfiguration: ITempSensorConfiguration): ITempReader {
        this._simTempSensor = new SimTempSensor(tempSensorConfiguration, -.2, 70);
        return new MovingAverageTempReader(this._simTempSensor, 3);
    }

	buildFurnaceTrigger(): ITrigger {
        return new SimTrigger(this.io, this._simTempSensor);
    }

    buildAcTrigger(): ITrigger {
        return new SimTrigger(this.io, this._simTempSensor);
    }
}