import Rx = require('rxjs');

import { IThermostatEvent, ThermostatEventType, ThermostatTopic } from '../../../common/thermostatEvent';
import { ThermostatMode } from '../../../common/thermostatMode';

import { ITempReader } from './tempReader';
import { IThermostatConfiguration } from './configuration';
import { ITrigger } from './trigger';

export interface IThermostat {
	mode: ThermostatMode;
	eventStream: Rx.Observable<IThermostatEvent>;
	target: number;
	start(): Rx.Observable<IThermostatEvent>;
	stop();
	isRunning(): boolean;
    setTarget(target: number);
    setMode(mode: ThermostatMode);
    startFan();
    stopFan();
}

export class Thermostat implements IThermostat {

	mode: ThermostatMode;
    private _target: number;
    private _targetOvershootBy: number;
    private _startTime: Date = null;
    private _stopTime: Date = null;
    private _currentTrigger: ITrigger;

    private _eventObservers: Rx.Observer<IThermostatEvent>[];
    public eventStream: Rx.Observable<IThermostatEvent>;

    constructor(public configuration: IThermostatConfiguration, 
                private _tempReader: ITempReader, 
                private _furnaceTrigger: ITrigger, 
                private _acTrigger: ITrigger,
                private _fanTrigger: ITrigger) {
				
        this.setMode((<any>ThermostatMode)[configuration.defaultMode]);
		this._eventObservers = [];
        this.eventStream = Rx.Observable.create((observer: Rx.Observer<IThermostatEvent>) => {
            this._eventObservers.push(observer);
			this.emitEvent(ThermostatEventType.Message, ThermostatTopic.Status, 'Initialized');
        }); 
    }

    get target(): number {
        return this._target;
    }

    start(): Rx.Observable<IThermostatEvent> {
        let tempReaderObservable = this._tempReader.start();
		
        tempReaderObservable.subscribe(
            (temperature:number) => this.tempReceived(temperature),
            (error: string) => { console.error('Error reading temperature: %s', error); },
            () => { this.emitComplete(); }
        );

        tempReaderObservable.throttleTime(this.configuration.tempEmitDelay).subscribe((temperature:number) => {
            this.emitEvent(ThermostatEventType.Message, ThermostatTopic.Temperature, temperature.toString());
        });

		this.emitEvent(ThermostatEventType.Message, ThermostatTopic.Status, 'Started');

        return this.eventStream;
    }

    stop() {
        this._tempReader.stop();
		this.emitComplete();
		this.emitEvent(ThermostatEventType.Message, ThermostatTopic.Status, 'Stopped');
    }

    private tryStartTrigger(temp: number) {
        if(this.isRunning() && Date.now() - this._startTime.getTime() > this.configuration.maxRunTime) {
           this.stopTrigger();
        }
		
        if((this.isFirstRun() || Date.now() - this._stopTime.getTime() > this.configuration.minDelayBetweenRuns) && !this.isRunning()) {
            this._targetOvershootBy = Math.min(Math.abs(this.target - temp), this.configuration.maxOvershootTemp);
            this.startTrigger();
        }
    }

    private tempReceived(temp: number) {
        if(this.mode === ThermostatMode.Heating) {
            if(temp < this.target - 1) {
                this.tryStartTrigger(temp);
            }
            else if(temp >= this.target + this._targetOvershootBy) {
                this.stopTrigger();
            }
        }
        else { //cooling
            if(temp > this.target + 1) {
                this.tryStartTrigger(temp);
            }
            else if(temp <= this.target - this._targetOvershootBy) {
                this.stopTrigger();
            }
        }
    }

    private startTrigger() {
        if(!this.isRunning()) {
            this._startTime = new Date();
            this._currentTrigger.start();
            this.emitTriggerEvent(true);
        }
    }

    private stopTrigger() {
        if(this.isRunning()) {
            this._startTime = null;
            this._stopTime = new Date();
            this._currentTrigger.stop();
            this.emitTriggerEvent(false);
        }
    }

    isRunning(): boolean {
        return this._startTime !== null;
    }

    setTarget(target: number) {
        if(target !== this._target) {
            if(this.targetIsWithinBounds(target)) {
                this._target = target;
            }
            else {
                if(target < this.targetRange[0]) {
                    this._target = this.targetRange[0];
                }
                else if(target > this.targetRange[1]) {
                    this._target = this.targetRange[1];
                }
            }

            this.emitEvent(ThermostatEventType.Message, ThermostatTopic.Target, target.toString());
        }
    }

    startFan() {
        this._fanTrigger.start();
    }

    stopFan() {
        this._fanTrigger.stop();
    }

	//TODO turn current trigger off before switching modes
    setMode(mode: ThermostatMode) {
        this.mode = mode;
        this.setTarget(this.defaultTarget);
        this._currentTrigger = mode === ThermostatMode.Heating ? this._furnaceTrigger : this._acTrigger;
		this.emitEvent(ThermostatEventType.Message, ThermostatTopic.Mode, mode.toString());
    }

    private targetIsWithinBounds(target: number) {
        return target >= this.targetRange[0] && target <= this.targetRange[1];
    }

	private get targetRange(): Array<number> {
		return this.mode === ThermostatMode.Heating ? this.configuration.heatingTargetRange : this.configuration.coolingTargetRange;
	}

	private get defaultTarget(): number {
        return this.mode === ThermostatMode.Heating ? this.configuration.heatingTargetRange[0] : this.configuration.coolingTargetRange[1];
    }

    private isFirstRun() {
        return this._stopTime === null;
    }

    private emitTriggerEvent(start: boolean) {
        let topic = this.mode === ThermostatMode.Heating ? 
							ThermostatTopic.Furnace : ThermostatTopic.Ac;
        let value = start ? 'on' : 'off';

        this.emitEvent(ThermostatEventType.Message, topic, value);
    }

    private emitEvent(type: ThermostatEventType, topic: string, message: string) {
        if(this._eventObservers) {
            this._eventObservers.forEach((observer) => {
				observer.next({
					type: type,
					topic: topic,
					message: message	
				});
			});
        }
    }

	private emitComplete() {
        if(this._eventObservers) {
            this._eventObservers.forEach((observer) => {
				observer.complete();
			});
        }
    }
}

