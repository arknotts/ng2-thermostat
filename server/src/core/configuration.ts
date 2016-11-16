import { ThermostatMode } from '../../../common/thermostatMode';

export interface IThermostatConfiguration {
	heatingTargetRange: Array<number>;
	coolingTargetRange: Array<number>;
    defaultMode: ThermostatMode;
    maxOvershootTemp: number;
    maxRunTime: number;
    minDelayBetweenRuns: number;
	tempEmitDelay: number;
    tempSensorPollDelay: number;
}

export class ThermostatConfiguration implements IThermostatConfiguration {

    constructor(public heatingTargetRange: Array<number>,
                public coolingTargetRange: Array<number>,
                public defaultMode: ThermostatMode,
                public maxOvershootTemp: number,
                public maxRunTime: number,
                public minDelayBetweenRuns: number,
                public tempSensorPollDelay: number,
                public tempEmitDelay: number) {

    }
}