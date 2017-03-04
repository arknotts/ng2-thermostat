import Rx = require('rxjs');

import { ITempResult } from '../../../common/thermostatEvent';
import { ITempSensor } from './tempSensor';


export interface ITempReader {
    start(): Rx.Observable<ITempResult>;
    stop(): void;
    tempSensor: ITempSensor;
}

export class MovingAverageTempReader implements ITempReader {

    constructor(public tempSensor: ITempSensor, private _windowSize: number) {}

    start(): Rx.Observable<ITempResult> {
        return this.tempSensor.start()
			.windowCount(this._windowSize, 1)
			.map((x: Rx.Observable<ITempResult>) => {
					return x.reduce((acc, curr) => { 
						return {
							temperature: acc.temperature + curr.temperature,
							humidity: acc.humidity + curr.humidity
						};
					})
					.map((x: ITempResult) => { 
						return {
							temperature: x.temperature/this._windowSize,
							humidity: x.humidity/this._windowSize
						};
					});
				}
			)
			.flatMap((v, i) => v);
    }

    stop() {
        this.tempSensor.stop();
    }
}