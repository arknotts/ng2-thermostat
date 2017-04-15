export interface IThermostatConfiguration {
	heatingTargetRange: Array<number>;
	coolingTargetRange: Array<number>;
    defaultMode: string;
    maxOvershootTemp: number;
    maxRunTime: number;
    minDelayBetweenRuns: number;
	tempEmitDelay: number;
    tempSensorPollDelay: number;
	deadZone: number;
}

export class ThermostatConfiguration implements IThermostatConfiguration {

    constructor(public heatingTargetRange: Array<number>,
                public coolingTargetRange: Array<number>,
                public defaultMode: string,
                public maxOvershootTemp: number,
                public maxRunTime: number,
                public minDelayBetweenRuns: number,
                public tempSensorPollDelay: number,
                public tempEmitDelay: number,
				public deadZone: number) {

    }
}