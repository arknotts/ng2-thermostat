import { Thermostat } from '../core/thermostat';
import { IThermostatConfiguration } from '../core/configuration';
import { ITempSensor, Dht11TempSensor } from '../core/tempSensor';
import { ITempReader, MovingAverageTempReader } from '../core/tempReader';
import { ITrigger, PiGpioTrigger } from '../core/trigger';

import { IPinConfiguration } from '../api/configuration';

import { SimTempSensor } from '../sim/simTempSensor';
import { SimTrigger } from '../sim/simTrigger';

export class ThermostatBuilder {

	private _thermostatConfiguration: IThermostatConfiguration;
	private _pinConfiguration: IPinConfiguration;

	constructor(thermostatConfiguration: IThermostatConfiguration, pinConfiguration: IPinConfiguration) {
		this._thermostatConfiguration = thermostatConfiguration;
		this._pinConfiguration = pinConfiguration;
	}

	buildThermostat(type: string): Thermostat {
		let tempSensor: ITempSensor;
		let tempReader: ITempReader;
		let furnaceTrigger: ITrigger;
		let acTrigger: ITrigger;
		let fanTrigger: ITrigger;

		if(type.toLowerCase() === 'rest') {
			tempSensor = new Dht11TempSensor(this._thermostatConfiguration.tempSensorPollDelay, this._pinConfiguration.tempSensor);
			tempReader = new MovingAverageTempReader(tempSensor, 5);
			furnaceTrigger = new PiGpioTrigger(this._pinConfiguration.furnaceTrigger);
			acTrigger = new PiGpioTrigger(this._pinConfiguration.acTrigger);
			fanTrigger = new PiGpioTrigger(this._pinConfiguration.fanTrigger);
		}
		else if(type.toLowerCase() === 'sim') {
			tempSensor = new SimTempSensor(this._thermostatConfiguration.tempSensorPollDelay, -.2, 70);
			tempReader = new MovingAverageTempReader(tempSensor, 3);
			furnaceTrigger = new SimTrigger(<SimTempSensor>tempSensor);
			acTrigger = new SimTrigger(<SimTempSensor>tempSensor);
			fanTrigger = new SimTrigger();
		}
		else {
			throw `Unknown thermostat type '${type}'`;
		}

		return new Thermostat(this._thermostatConfiguration, tempReader, furnaceTrigger, acTrigger, fanTrigger);
	}
}