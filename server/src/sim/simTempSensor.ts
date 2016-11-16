import { BaseTempSensor } from '../core/tempSensor';

export class SimTempSensor extends BaseTempSensor {

    currTemp: number;
    lastTempDropMillis: number;

    constructor(temperatureSensorPollDelay: number, public tempChangePerSecond: number, currTemp: number) {
        super(temperatureSensorPollDelay);

		this.currTemp = currTemp;
		this.lastTempDropMillis = Date.now();
    }
    
    pollSensor(): number {
        let nowMillis = Date.now();
        let diff = nowMillis - this.lastTempDropMillis;

        if(diff > 1) {
            this.currTemp = +(this.currTemp + this.tempChangePerSecond).toFixed(1);
            this.lastTempDropMillis = nowMillis;
        }

        return this.currTemp;
    }


}