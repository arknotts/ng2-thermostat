import { ITrigger } from '../core/trigger';
import { SimTempSensor } from './simTempSensor';

export class SimTrigger implements ITrigger {

	constructor(private _simTempSensor: SimTempSensor) {
	}

	start() {
		this._simTempSensor.tempChangePerSecond = -this._simTempSensor.tempChangePerSecond;
	}

	stop() {
		this._simTempSensor.tempChangePerSecond = -this._simTempSensor.tempChangePerSecond;
	}
}