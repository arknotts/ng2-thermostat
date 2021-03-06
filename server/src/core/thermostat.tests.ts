import Rx = require('rxjs');
import * as chai from 'chai';
import * as sinon from 'sinon';
var expect = chai.expect;

import { ThermostatMode } from '../../../common/thermostatMode';
import { ITempResult } from '../../../common/thermostatEvent';

import { ITempReader, MovingAverageTempReader } from './tempReader';
import { ITempSensor, MockTempSensor } from './tempSensor';
import { Thermostat } from './thermostat';
import { IThermostatConfiguration, ThermostatConfiguration } from './configuration';
import { ITrigger } from './trigger';
import { IThermostatEvent } from '../../../common/thermostatEvent';

describe('Thermostat Unit Tests:', () => {

    let heatingRange: Array<number>;
    let coolingRange: Array<number>;

    let cfg: IThermostatConfiguration;
    let tempSensor: ITempSensor;
    let tempRdr: ITempReader;
    let thermostat: Thermostat;
    let furnaceTrigger: ITrigger;
    let fanTrigger;
    let acTrigger: ITrigger;

    let tickDelay = 2;
    let windowSize = 2;

    let clock: Sinon.SinonFakeTimers;

    function buildThermostat(mode: ThermostatMode = null, cfgOverride: IThermostatConfiguration = null): Thermostat {
        heatingRange = [55,75];
        coolingRange = [68,80];

		cfg = cfgOverride || new ThermostatConfiguration(heatingRange, coolingRange, "Heating", 1, 2000, 5, tickDelay, 5000, 2);

        tempSensor = new MockTempSensor(tickDelay);
        tempRdr = new MovingAverageTempReader(tempSensor, windowSize);
        furnaceTrigger = <ITrigger> {
			start: () => {},
			stop: () => {}
		};
        acTrigger = <ITrigger> {
			start: () => {},
			stop: () => {}
		};
		fanTrigger = {
			start: sinon.spy(),
			stop: sinon.spy()
		};
        thermostat = new Thermostat(cfg, tempRdr, furnaceTrigger, acTrigger, fanTrigger);
		if(mode) {
        	thermostat.setMode(mode);
		}
        
        return thermostat;
    }

    function buildRunningThermostat(mode: ThermostatMode, autoStart: boolean = true): Rx.Observable<Thermostat> {
        let observable = Rx.Observable.create((observer: Rx.Observer<Thermostat>) => {
            buildThermostat(mode);

			thermostat.setTarget(70);

			let trigger = mode === ThermostatMode.Heating ? furnaceTrigger : acTrigger;
			sinon.stub(trigger, 'start', () => {
				observer.next(thermostat);
				observer.complete();
			});

			sinon.stub(tempSensor, 'pollSensor', () => {
				return thermostat.mode === ThermostatMode.Heating ? {temperature: thermostat.target - 5} : {temperature: thermostat.target + 5};
			});

			if(autoStart) {
				thermostat.start();
			}
        });
        
        return observable;
    }

    beforeEach(function() {
        buildThermostat(ThermostatMode.Heating);
    });

    afterEach(function(done) {
        if(clock) {
            clock.restore();
            clock = null;
        }

        //if it's still running, subscribe, stop it, and don't continue until it's completed
        //(this avoids cross-test bleeding of observable values)
        if(thermostat.isRunning()) {
            thermostat.eventStream.subscribe(
                () => {},
                () => {},
                () => { //completed
                    done();
                }
            );
            thermostat.stop();
        }
        else {
            done();
        }
    });

	describe('Thermostat initialization spec', () => {
		describe('creating new thermostat', () => {
			it('should default to safe values', (done) => {
				
				expect(thermostat.target).is.equals(heatingRange[0]);

				thermostat.setMode(ThermostatMode.Cooling);
				expect(thermostat.target).is.equals(coolingRange[1]);
				
				done();
			});

			it('should default to mode specified in configuration', (done) => {
				let thisCfg = new ThermostatConfiguration(heatingRange, coolingRange, "Heating", 1, 2000, 5, tickDelay, 5000, 2);
				buildThermostat(null, thisCfg);
				expect(thermostat.mode).to.equal(ThermostatMode.Heating);

				thisCfg.defaultMode = "Cooling";
				buildThermostat(null, thisCfg);
				expect(thermostat.mode).to.equal(ThermostatMode.Cooling);
				
				thisCfg.defaultMode = "Off";
				buildThermostat(null, thisCfg);
				expect(thermostat.mode).to.equal(ThermostatMode.Off);

				done();
			});
		});

		describe('setting target outside bounds', () => {
			it('should set to closest valid value', (done) => {
				thermostat.setTarget(heatingRange[0]-5); //set 5 under
				expect(thermostat.target).is.equals(heatingRange[0]);

				thermostat.setTarget(heatingRange[1]+5); //set 5 over
				expect(thermostat.target).is.equals(heatingRange[1]);
				
				done();
			});
		});
	});
        
	describe('furnace spec', () => {
		describe('temperature dropping below target', () => {
			it('should start furnace', (done) => {
				let temperatures = [72,71,70,69,68,67,66];
				let temperature$ = new Rx.Subject<ITempResult>();
				let target = 70;
				thermostat.setTarget(target);
				let shouldTurnOnAtTemperature = Math.floor(target - cfg.deadZone);

				sinon.stub(tempRdr, "start", () => temperature$);
				furnaceTrigger.start = sinon.spy();
				thermostat.start();

				while(temperatures.length) {
					let temperature = temperatures.shift();
					temperature$.next({temperature: temperature});

					if(temperature == shouldTurnOnAtTemperature) {
						sinon.assert.calledOnce(<sinon.SinonSpy>furnaceTrigger.start);
						done();
						break;
					}
					else {
						sinon.assert.notCalled(<sinon.SinonSpy>furnaceTrigger.start);
					}
				}

				temperature$.complete();
			});
		});

		describe('temperature staying above target', () => {
			it('should not start furnace', (done) => {
				let temperature$ = Rx.Observable.from([71,70,70,70,71,70,70,72,71]).map(x => <ITempResult>{ temperature: x });
				thermostat.setTarget(70);
				let startCalled: boolean = false;

				sinon.stub(tempRdr, "start", () => temperature$);
				sinon.stub(furnaceTrigger, "start", () => startCalled = true);

				thermostat.start();

				temperature$.subscribe(
					null, null,
					() => {
						expect(startCalled).to.be.false;
						done();
					}
				);
			});
		});

		describe('starting furnace', () => {
			it('should overshoot temperature', (done) => {
				let target = 70;
				let temperatureResults = [67,68,69,70,71,72,73,74,75,76,77].map(x => <ITempResult>{ temperature: x });
				let temperature$ = Rx.Observable.create((observer: Rx.Observer<ITempResult>) => {
					while(temperatureResults.length > 0) {
						observer.next(temperatureResults.shift());
					};

					observer.complete();
				});
				let shouldOvershootBy = target - temperatureResults[0].temperature;
				let stopTemperature: number = 0;
				cfg.maxOvershootTemp = 4;
				thermostat.setTarget(target);

				sinon.stub(tempRdr, "start", () => temperature$);
				sinon.stub(furnaceTrigger, "stop", () => {
					stopTemperature = temperatureResults[0].temperature - 1;
				});

				thermostat.start();

				temperature$.subscribe(
					null,
					null,
					() => {
						expect(stopTemperature).to.equal(target + shouldOvershootBy);
						done();
					}
				);
			});

			it('should overshoot temperature by a maximum according to configuration', (done) => {
				cfg.maxOvershootTemp = 2;
				let target = 70;
				let temperatureResults = [66,67,68,69,70,71,72,73,74,75,76,77].map(x => <ITempResult>{ temperature: x });
				let temperature$ = Rx.Observable.create((observer: Rx.Observer<ITempResult>) => {
					while(temperatureResults.length > 0) {
						observer.next(temperatureResults.shift());
					};

					observer.complete();
				});
				let stopTemperature: number = 0;
				thermostat.setTarget(target);

				sinon.stub(tempRdr, "start", () => temperature$);
				sinon.stub(furnaceTrigger, "stop", () => {
					stopTemperature = temperatureResults[0].temperature - 1;
				});

				thermostat.start();

				temperature$.subscribe(
					null,
					null,
					() => {
						expect(stopTemperature).to.equal(target + cfg.maxOvershootTemp);
						done();
					}
				);
			});
		});

		describe('temperature rising above target + overshoot temp', () => {
			it('should stop furnace', (done) => {
				let temperature$ = Rx.Observable.from([67,68,69,70,71,72,73,74,75,76,77]).map(x => <ITempResult>{ temperature: x });
				thermostat.setTarget(70);
				let startCalled: boolean = false;
				let stopCalled: boolean = false;

				sinon.stub(tempRdr, "start", () => temperature$);
				sinon.stub(furnaceTrigger, "start", () => startCalled = true);
				sinon.stub(furnaceTrigger, "stop", () => stopCalled = true);

				thermostat.start();

				temperature$.subscribe(
					null, null,
					() => {
						expect(startCalled).to.be.true;
						expect(stopCalled).to.be.true;
						done();
					}
				);
			});
		});
	});

	describe('air conditioning spec', () => {
		beforeEach(() => {
			thermostat.setMode(ThermostatMode.Cooling);
		});

		describe('temperature rising above target', () => {
			it('should start air conditioner', (done) => {
				let temperatures = [66,67,68,69,70,71,72];
				let temperature$ = new Rx.Subject<ITempResult>();
				let target = 70;
				thermostat.setTarget(target);
				let shouldTurnOnAtTemperature = Math.floor(target + cfg.deadZone);

				sinon.stub(tempRdr, "start", () => temperature$);
				acTrigger.start = sinon.spy();
				thermostat.start();

				while(temperatures.length) {
					let temperature = temperatures.shift();
					temperature$.next({temperature: temperature});

					if(temperature == shouldTurnOnAtTemperature) {
						sinon.assert.calledOnce(<sinon.SinonSpy>acTrigger.start);
						done();
						break;
					}
					else {
						sinon.assert.notCalled(<sinon.SinonSpy>acTrigger.start);
					}
				}

				temperature$.complete();
			});
		});

		describe('temperature staying at or below target', () => {
			it('should not start air conditioner', (done) => {
				let obs = Rx.Observable.from([71,70,69,70,71,70,70,72,73,72,71]).map(x => <ITempResult>{ temperature: x });
				
				thermostat.setTarget(73);
				let startCalled: boolean = false;

				sinon.stub(tempRdr, "start", () => obs);
				sinon.stub(acTrigger, "start", () => startCalled = true);

				thermostat.start();

				obs.subscribe(
					null, null,
					() => {
						expect(startCalled).to.be.false;
						done();
					}
				);
			});
		});

		describe('temperature falling below target - overshoot temp', () => {
			it('should stop air conditioner', (done) => {
				let obs = Rx.Observable.from([77,76,75,74,73,72,71,70,69,68,67,66,65]).map(x => <ITempResult>{ temperature: x });
				thermostat.setTarget(70);
				let startCalled: boolean = false;
				let stopCalled: boolean = false;

				sinon.stub(tempRdr, "start", () => obs);
				sinon.stub(acTrigger, "start", () => startCalled = true);
				sinon.stub(acTrigger, "stop", () => {
					if(startCalled) {
						stopCalled = true;
					}
					else {
						done("Stop air conditioner called before start.");
					}
				});

				thermostat.start();

				obs.subscribe(
					null, null,
					() => {
						if(stopCalled) {
							done();
						}
						else {
							done("Stop never called");
						}
					}
				);
			});
		});
	});

	describe('fan spec', () => {
		describe('starting fan', () => {
			it('should start fan trigger', () => {
				thermostat.startFan();
				sinon.assert.calledOnce(fanTrigger.start);
			});
		});

		describe('stopping fan', () => {
			it('should stop fan trigger', () => {
				thermostat.stopFan();
				sinon.assert.calledOnce(fanTrigger.stop);
			});
		});
	});

	describe('failsafe spec', () => {
		describe('furnace running for longer than max run time', () => {
			it('should stop furnace', (done) => {
				thermostat.setTarget(70);
				cfg.maxRunTime = 10;
				clock = sinon.useFakeTimers();  
				let startCalled: boolean = false;
				let stopCalled: boolean = false;

				sinon.stub(tempRdr, "start", () => Rx.Observable.interval(1).map(() => <ITempResult>{ temperature: 65 }));
				sinon.stub(furnaceTrigger, "start", () => startCalled = true);
				sinon.stub(furnaceTrigger, "stop", () => stopCalled = true);				

				thermostat.start();
				
				clock.tick(cfg.maxRunTime - 1);
				expect(startCalled).to.be.true;
				expect(stopCalled).to.be.false;

				clock.tick(cfg.maxRunTime + 1);
				expect(stopCalled).to.be.true;

				done();
			});
		});

		describe('when furnace stops running, it', () => {
			it('should not run again until at least MinDelayBetweenRuns later', (done) => {
				thermostat.setTarget(70);
				cfg.maxRunTime = 1;
				cfg.minDelayBetweenRuns = 10;
				let startCalled: boolean = false;
				let stopCalled: boolean = false;
				clock = sinon.useFakeTimers();

				sinon.stub(tempRdr, "start", () => Rx.Observable.interval(1).map(() => {
					if(startCalled) {
						if(stopCalled) {
							//started, then stopped, need to try and start again
							return { temperature: 65 };
						}
						else {
							//started but not stopped yet
							return { temperature: 75 };
						}
					}
					
					return { temperature: 65 };
				}));
				sinon.stub(furnaceTrigger, "start", () => startCalled = true);
				sinon.stub(furnaceTrigger, "stop", () => stopCalled = true);

				thermostat.start();

				clock.tick(1);
				expect(startCalled).to.be.true;
				startCalled = false;
				clock.tick(2);
				expect(stopCalled).to.be.true;

				clock.tick(cfg.minDelayBetweenRuns - 1);
				expect(startCalled).to.be.false;
				clock.tick(10);
				expect(startCalled).to.be.true;

				done();
			});
		});

		describe('air conditioner running for longer than max run time', () => {
			it('should stop air conditioner', (done) => {
				thermostat.setMode(ThermostatMode.Cooling);
				thermostat.setTarget(70);
				cfg.maxRunTime = 10;
				clock = sinon.useFakeTimers();  
				let startCalled: boolean = false;
				let stopCalled: boolean = false;

				sinon.stub(tempRdr, "start", () => Rx.Observable.interval(1).map(() => <ITempResult>{ temperature: 75 }));
				sinon.stub(acTrigger, "start", () => startCalled = true);
				sinon.stub(acTrigger, "stop", () => stopCalled = true);				

				thermostat.start();
				
				clock.tick(cfg.maxRunTime - 1);
				expect(startCalled).to.be.true;
				expect(stopCalled).to.be.false;

				clock.tick(cfg.maxRunTime + 1);
				expect(stopCalled).to.be.true;

				done();
			});
		});

		describe('when air conditioner stops running, it', () => {
			it('should not run again until at least MinDelayBetweenRuns later', (done) => {
				thermostat.setMode(ThermostatMode.Cooling);
				thermostat.setTarget(70);
				cfg.maxRunTime = 1;
				cfg.minDelayBetweenRuns = 10;
				let startCalled: boolean = false;
				let stopCalled: boolean = false;
				clock = sinon.useFakeTimers();

				sinon.stub(tempRdr, "start", () => Rx.Observable.interval(1).map(() => {
					if(startCalled) {
						if(stopCalled) {
							//started, then stopped, need to try and start again
							return { temperature: 75 };
						}
						else {
							//started but not stopped yet
							return { temperature: 65 };
						}
					}
					
					return { temperature: 75 };
				}));
				sinon.stub(acTrigger, "start", () => startCalled = true);
				sinon.stub(acTrigger, "stop", () => stopCalled = true);

				thermostat.start();

				clock.tick(1);
				expect(startCalled).to.be.true;
				startCalled = false;
				clock.tick(2);
				expect(stopCalled).to.be.true;

				clock.tick(cfg.minDelayBetweenRuns - 1);
				expect(startCalled).to.be.false;
				clock.tick(10);
				expect(startCalled).to.be.true;

				done();
			});
		});
	});

	describe('event spec', () => {

		describe('when furnace trigger is started, it', () => {
			it('should emit an "on" message', (done) => {
				thermostat.start().subscribe((e: IThermostatEvent) => {
					if(e.topic === 'thermostat/furnace' && e.message === 'on') {
						thermostat.stop();
						done();
					}
				});

				(<any>thermostat).startTrigger();
			});
		});

		describe('when furnace trigger is stopped, it', () => {
			it('should emit an "off" message', (done) => {
				
				buildRunningThermostat(ThermostatMode.Heating).subscribe((runningThermostat) => {
					runningThermostat.eventStream.subscribe((e: IThermostatEvent) => {
						if(e.topic === 'thermostat/furnace' && e.message === 'off') {
							runningThermostat.stop();
							done();
						}
					}); 
					(<any>thermostat).stopTrigger();
				}); 

			});
		});

		describe('when ac trigger is started, it', () => {
			it('should emit an "on" message', (done) => {
				thermostat.setMode(ThermostatMode.Cooling);
				thermostat.start().subscribe((e: IThermostatEvent) => {
					if(e.topic === 'thermostat/ac' && e.message === 'on') {
						thermostat.stop();
						done();
					}
				});

				(<any>thermostat).startTrigger();
			});
		});

		describe('when ac trigger is stopped, it', () => {
			it('should emit an "off" message', (done) => {
				buildRunningThermostat(ThermostatMode.Cooling).subscribe((runningThermostat) => {
					runningThermostat.eventStream.subscribe((e: IThermostatEvent) => {
						if(e.topic === 'thermostat/ac' && e.message === 'off') {
							runningThermostat.stop();
							done();
						}
					}); 
					(<any>thermostat).stopTrigger();
				}); 
			});
		});

		describe('when thermostat is running, it', () => {

			it('should emit a temperature message at the appropriate interval', (done) => {
				let tempEmitDelay = 50;
				let iterations = 5;
				cfg.tempEmitDelay = tempEmitDelay;
				clock = sinon.useFakeTimers();
				
				let lastNow: number = null;
				let msgCount = 0;
				thermostat.eventStream.subscribe((e: IThermostatEvent) => {
					if(e.topic === 'sensors/temperature/thermostat') {
						let now: number = Date.now();
						if(lastNow) {
							let diff = Math.abs(now - lastNow);
							expect(diff).to.be.within(tempEmitDelay-10, tempEmitDelay+10);
						}

						lastNow = now;
						msgCount++;

						if(msgCount >= iterations) {
							done();
						}
					}
				}); 

				thermostat.start();
				clock.tick(tempEmitDelay*iterations);
			});
		});

		describe('when target is changed, it', () => {
			it('should emit a "target changed" message', (done) => {

				buildThermostat(ThermostatMode.Heating);
				
				let newTarget = thermostat.target + 2;

				thermostat.eventStream.subscribe((e: IThermostatEvent) => {
					if(e.topic === 'thermostat/target') {
						expect(e.message).to.equal(newTarget.toString());
						done();
					}
				}); 
				
				thermostat.setTarget(newTarget);
			});
		});

		describe('when fan is started, it', () => {
			it('should emit a fan start message', (done) => {

				buildThermostat();

				thermostat.eventStream.subscribe((e: IThermostatEvent) => {
					if(e.topic === 'thermostat/fan') {
						expect(e.message).to.equal('start');
						done();
					}
				}); 
				
				thermostat.startFan();
			});
		});

		describe('when fan is started, it', () => {
			it('should emit a fan start message', (done) => {

				buildThermostat();

				thermostat.eventStream.subscribe((e: IThermostatEvent) => {
					if(e.topic === 'thermostat/fan') {
						expect(e.message).to.equal('stop');
						done();
					}
				}); 
				
				thermostat.stopFan();
			});
		});

		describe('when target is set to the current value, it', () => {
			it('should not emit a "target changed" message', (done) => {
				clock = sinon.useFakeTimers();
				buildThermostat(ThermostatMode.Heating);

				let newTarget = thermostat.target;

				thermostat.eventStream.subscribe((e: IThermostatEvent) => {
					if(e.topic === 'thermostat/target') {
						throw new Error('Received thermostat/target message when not expected');
					}
				}); 
				
				thermostat.setTarget(newTarget);

				clock.tick(500);

				done();
			});
		});
	});

	describe('mode spec', () => {
		describe('when switching to cooling, it', () => {
			it('should stop the furnace trigger first', (done) => {
				buildRunningThermostat(ThermostatMode.Heating).subscribe((runningThermostat) => {
					furnaceTrigger.stop = sinon.spy();

					runningThermostat.setMode(ThermostatMode.Cooling);

					sinon.assert.calledOnce(<sinon.SinonSpy>furnaceTrigger.stop);
					done();
				});
			});
		});

		describe('when switching to heating, it', () => {
			it('should stop the A/C trigger first', (done) => {
				buildRunningThermostat(ThermostatMode.Cooling).subscribe((runningThermostat) => {
					acTrigger.stop = sinon.spy();

					runningThermostat.setMode(ThermostatMode.Heating);

					sinon.assert.calledOnce(<sinon.SinonSpy>acTrigger.stop);
					done();
				});
			});
		});

		it('should not start furnace when mode is set to off', (done) => {
			furnaceTrigger.start = sinon.spy();
			let temperature$ = new Rx.Subject<ITempResult>();
			sinon.stub(tempRdr, "start", () => temperature$);
			thermostat.setMode(ThermostatMode.Off);
			thermostat.setTarget(70);
			
			thermostat.start();
			temperature$.next({temperature: 60});

			sinon.assert.notCalled(<sinon.SinonSpy>furnaceTrigger.start);
			done();
		});

		it('should not start A/C when mode is set to off', (done) => {
			acTrigger.start = sinon.spy();
			let temperature$ = new Rx.Subject<ITempResult>();
			sinon.stub(tempRdr, "start", () => temperature$);
			thermostat.setMode(ThermostatMode.Off);
			thermostat.setTarget(70);
			
			thermostat.start();
			temperature$.next({temperature: 80});

			sinon.assert.notCalled(<sinon.SinonSpy>acTrigger.start);
			done();
		});
	});
});