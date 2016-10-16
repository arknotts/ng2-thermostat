import Rx = require('rxjs');

import { IThermostatEvent, ThermostatEventType, ThermostatTopic } from '../../../common/thermostatEvent';
import { ThermostatMode } from '../../../common/thermostatMode';

import { ITempReader } from './tempReader';
import { IThermostatConfiguration } from './configuration';
import { MovingAverageTempReader } from './tempReader';
import { Dht11TempSensor } from './tempSensor';
import { ITrigger } from './trigger';

export class Thermostat {

    private _target: number;
    private _targetOvershootBy: number;
    private _startTime: Date;
    private _stopTime: Date;
    private _currentTrigger: ITrigger;

    private _eventObservers: Rx.Observer<IThermostatEvent>[];
    public eventStream: Rx.Observable<IThermostatEvent>;

    constructor(public configuration: IThermostatConfiguration, 
                private _tempReader: ITempReader, 
                private _furnaceTrigger: ITrigger, 
                private _acTrigger: ITrigger) {
				
        this.setMode(configuration.Mode);
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

		this.emitEvent(ThermostatEventType.Message, ThermostatTopic.Status, 'Started');

        return this.eventStream;
    }

    stop() {
        this._tempReader.stop();
		this.emitEvent(ThermostatEventType.Message, ThermostatTopic.Status, 'Stopped');
    }

    private tryStartTrigger(temp: number) {
        if(this.isRunning() && Date.now() - this._startTime.getTime() > this.configuration.MaxRunTime) {
           this.stopTrigger();
        }
		
        if(this.isFirstRun() || Date.now() - this._stopTime.getTime() > this.configuration.MinDelayBetweenRuns) {
            this._targetOvershootBy = Math.min(Math.abs(this.target - temp), this.configuration.MaxOvershootTemp)
            this.startTrigger();
        }
    }

    tempReceived(temp: number) {
		
        if(this.configuration.Mode == ThermostatMode.Heating) {
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

        this.emitEvent(ThermostatEventType.Message, ThermostatTopic.Temperature, temp.toString());
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
        return this._startTime != null;
    }

    setTarget(target: number) {
        if(target != this._target) {
            if(this.targetIsWithinBounds(target)) {
                this._target = target;
            }
            else {
                if(target < this.configuration.TargetRange[0]) {
                    this._target = this.configuration.TargetRange[0];
                }
                else if(target > this.configuration.TargetRange[1]) {
                    this._target = this.configuration.TargetRange[1];
                }
            }

            this.emitEvent(ThermostatEventType.Message, ThermostatTopic.Target, target.toString());
        }
    }

    get mode(): ThermostatMode {
        return this.configuration.Mode;
    }

    setMode(mode: ThermostatMode) {
        this.configuration.Mode = mode;
        this.setTarget(this.configuration.DefaultTarget);
        this._currentTrigger = mode == ThermostatMode.Heating ? this._furnaceTrigger : this._acTrigger;
		this.emitEvent(ThermostatEventType.Message, ThermostatTopic.Mode, mode.toString());
    }

    get tempReader(): ITempReader {
        return this._tempReader;
    }

    private targetIsWithinBounds(target: number) {
        return target >= this.configuration.TargetRange[0] && target <= this.configuration.TargetRange[1];
    }

    private isFirstRun() {
        return this._stopTime == null;
    }

    private emitTriggerEvent(start: boolean) {
        let topic = this.configuration.Mode == ThermostatMode.Heating ? 
							ThermostatTopic.Furnace : ThermostatTopic.Ac;
        let value = start ? 'on' : 'off';

        this.emitEvent(ThermostatEventType.Message, topic, value);
    }

    private emitEvent(type: ThermostatEventType, topic: Array<string>, message: string) {
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

