import { ITrigger } from '../core/trigger';
import { SimTempSensor } from './simTempSensor';

export class SimTrigger implements ITrigger {

	constructor(private _simTempSensor: SimTempSensor = null) {
	}

	start() {
		if(this._simTempSensor) {
			this._simTempSensor.tempChangePerSecond = -this._simTempSensor.tempChangePerSecond;
		}
	}

	stop() {
		if(this._simTempSensor) {
			this._simTempSensor.tempChangePerSecond = -this._simTempSensor.tempChangePerSecond;
		}
	}
}