var environment = process.env.NODE_ENV;
var dht: any = environment && environment.toUpperCase() === 'PRODUCTION' ? require('node-dht-sensor') : null;
import Rx = require('rxjs');

export interface ITempSensor {
    start(): Rx.Observable<number>;
    stop(): void;
    pollSensor(): number;
}

export abstract class BaseTempSensor implements ITempSensor {
    private _start: boolean = false;
    private _timeoutId: any;
	private _temperatureSensorPollDelay: number;

    constructor(temperatureSensorPollDelay: number) {
		this._temperatureSensorPollDelay = temperatureSensorPollDelay;
	}
    
    start(): Rx.Observable<number> {
        this._start = true;
        
        return Rx.Observable.create((observer: Rx.Observer<number>) => {
            this.pollAndEmitTemperature(observer);
        });
    }

    stop() {
        this._start = false;
    }

    abstract pollSensor(): number;

    private pollAndEmitTemperature(observer: Rx.Observer<number>): void {
        if(this._start) {
            observer.next(this.pollSensor());
            this._timeoutId = setTimeout(() => { this.pollAndEmitTemperature(observer); }, this._temperatureSensorPollDelay);
        }
        else {
            clearTimeout(this._timeoutId);
            observer.complete();
        }
    }
}

class DhtTempSensor extends BaseTempSensor {
    constructor(temperatureSensorPollDelay: number, private _sensorType: number, private _gpioPin: number) {
        super(temperatureSensorPollDelay);

        if(!dht.initialize(_sensorType, _gpioPin)) {
            throw `Error initializing DHT${_sensorType} temperature sensor`;
        }

    }

    pollSensor(): number {
        let rawValue = dht.read();
        let degreesCelsius = parseFloat(rawValue.temperature);
        let degreesFahrenheit = degreesCelsius*1.8 + 32;
        //let humidity = rawValue.humidity.toFixed(2); //TODO 
        return degreesFahrenheit;
    }
}

export class Dht11TempSensor extends DhtTempSensor {
    constructor(temperatureSensorPollDelay: number, gpioPin: number) {
        super(temperatureSensorPollDelay, 11, gpioPin);
    }
}

export class Dht22TempSensor extends DhtTempSensor {
    constructor(temperatureSensorPollDelay: number, gpioPin: number) {
        super(temperatureSensorPollDelay, 22, gpioPin);
    }
}

export class MockTempSensor extends BaseTempSensor {
    constructor(temperatureSensorPollDelay: number) {
        super(temperatureSensorPollDelay);
    }

    pollSensor(): number {
        return 70;
    }
}