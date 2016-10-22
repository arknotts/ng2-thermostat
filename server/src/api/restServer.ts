import { ThermostatMode } from '../../../common/thermostatMode';

import { BaseServer } from './baseServer';
import { ITrigger, FurnaceTrigger, AcTrigger } from '../core/trigger';
import { IThermostatConfiguration, ITempSensorConfiguration } from '../core/configuration';
import { ITempSensor, Dht11TempSensor } from '../core/tempSensor';
import { ITempReader, MovingAverageTempReader } from '../core/tempReader';

const PIN_TEMP_SENSOR = 15;

export class RestServer extends BaseServer {

	constructor() {
		super();
	}

	buildConfiguration(passedConfiguration: any): IThermostatConfiguration {
        let mode: ThermostatMode = passedConfiguration.mode ? 
                                        (<any>ThermostatMode)[passedConfiguration.mode] :
                                        (<any>ThermostatMode)["Heating"];
            
        let configDefaults = <IThermostatConfiguration> {
            TargetRange: mode == ThermostatMode.Heating ? [60, 75] : [68, 80],
            DefaultTarget: mode == ThermostatMode.Heating ? 69 : 75,
            MaxOvershootTemp: 4,
            MaxRunTime: 1800000,
            MinDelayBetweenRuns: 600000,
            TempEmitDelay: 300000
        };

        let tempSensorConfigDefaults = <ITempSensorConfiguration> {
            TemperatureSensorPollDelay: 5000
        };

        let configuration: IThermostatConfiguration = {
            TargetRange: passedConfiguration.TargetRange || configDefaults.TargetRange,
            Mode: mode,
            DefaultTarget: passedConfiguration.DefaultTarget || configDefaults.DefaultTarget,
            MaxOvershootTemp: passedConfiguration.MaxOvershootTemp || configDefaults.MaxOvershootTemp,
            MaxRunTime: passedConfiguration.MaxRunTime || configDefaults.MaxRunTime,
            MinDelayBetweenRuns: passedConfiguration.MinDelayBetweenRuns || configDefaults.MinDelayBetweenRuns,
            TempEmitDelay: parseInt(passedConfiguration.TempEmitDelay) || configDefaults.TempEmitDelay,
            TempSensorConfiguration: {
                TemperatureSensorPollDelay: passedConfiguration.TemperatureSensorPollDelay || tempSensorConfigDefaults.TemperatureSensorPollDelay
            }
        };

        return configuration;
    }

	buildTempReader(tempSensorConfiguration: ITempSensorConfiguration): ITempReader {
        let tempSensor: ITempSensor = new Dht11TempSensor(tempSensorConfiguration, PIN_TEMP_SENSOR);
        return new MovingAverageTempReader(tempSensor, 5);
    }

    buildFurnaceTrigger(): ITrigger {
        return new FurnaceTrigger();
    }

    buildAcTrigger(): ITrigger {
        return new AcTrigger();
    }
}