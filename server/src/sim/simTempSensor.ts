import { ITempResult } from '../../../common/thermostatEvent';
import { BaseTempSensor } from '../core/tempSensor';

export class SimTempSensor extends BaseTempSensor {

    currTemp: number;
	currHumidity: number;
    lastTempDropMillis: number;

    constructor(temperatureSensorPollDelay: number, public tempChangePerSecond: number, currTemp: number) {
        super(temperatureSensorPollDelay);

		this.currTemp = currTemp;
		this.currHumidity = 50;
		this.lastTempDropMillis = Date.now();
    }
    
    pollSensor(): ITempResult {
        let nowMillis = Date.now();
        let diff = nowMillis - this.lastTempDropMillis;

        if(diff > 1) {
            this.currTemp = +(this.currTemp + this.tempChangePerSecond).toFixed(1);
            this.lastTempDropMillis = nowMillis;
        }

		if(Math.random() > .5) {
			this.currHumidity += 2;
		}
		else {
			this.currHumidity -= 2;
		}
		if(this.currHumidity > 100) {
			this.currHumidity = 100;
		}
		if(this.currHumidity < 0) {
			this.currHumidity = 0;
		}

        return {
			temperature: this.currTemp,
			humidity: this.currHumidity
		};
    }


}