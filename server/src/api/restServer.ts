import * as socketIo from 'socket.io';

import { ThermostatMode } from '../../../common/thermostatMode';

import { ITrigger, PiGpioTrigger, AcTrigger } from '../core/trigger';
import { IThermostatConfiguration, ITempSensorConfiguration } from '../core/configuration';
import { ITempSensor, Dht11TempSensor } from '../core/tempSensor';
import { ITempReader, MovingAverageTempReader } from '../core/tempReader';

import { BaseServer } from './baseServer';
import { IBroadcaster } from './broadcaster';
import { Scheduler } from './schedule';

const PIN_TEMP_SENSOR = 4;
const PIN_FURNACE_TRIGGER = 15; //PIN 15, GPIO3

export class RestServer extends BaseServer {

	constructor(thermostatConfiguration: IThermostatConfiguration, io: SocketIO.Server, broadcaster: IBroadcaster, schedule: Scheduler) {
		super(thermostatConfiguration, io, broadcaster, schedule);
	}

	buildTempReader(tempSensorConfiguration: ITempSensorConfiguration): ITempReader {
        let tempSensor: ITempSensor = new Dht11TempSensor(tempSensorConfiguration, PIN_TEMP_SENSOR);
        return new MovingAverageTempReader(tempSensor, 5);
    }

    buildFurnaceTrigger(): ITrigger {
        return new PiGpioTrigger(PIN_FURNACE_TRIGGER);
    }

    buildAcTrigger(): ITrigger {
        return new AcTrigger();
    }
}