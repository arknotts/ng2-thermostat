import Rx = require('rxjs');
import * as chai from 'chai';
import * as sinon from 'sinon';
var expect = chai.expect;

import { ThermostatMode } from '../../../common/thermostatMode';

import { ITempReader, MovingAverageTempReader } from './tempReader';
import { ITempSensor, MockTempSensor } from './tempSensor';
import { Thermostat } from './thermostat';
import { IThermostatConfiguration, ThermostatConfiguration } from './configuration';
import { ITrigger, FurnaceTrigger, AcTrigger } from './trigger';
import { IThermostatEvent } from '../../../common/thermostatEvent';

describe('Thermostat Unit Tests:', () => {

    let heatingRange: Array<number>;
    let coolingRange: Array<number>;

    let cfg: IThermostatConfiguration;
    let tempSensor: ITempSensor;
    let tempRdr: ITempReader;
    let thermostat: Thermostat;
    let furnaceTrigger: ITrigger;
    let acTrigger: ITrigger;

    let tickDelay = 2;
    let windowSize = 2;

    let clock: Sinon.SinonFakeTimers;

    function buildThermostat(mode: ThermostatMode = null, cfgOverride: IThermostatConfiguration = null): Thermostat {
        heatingRange = [55,75];
        coolingRange = [68,80];

		cfg = cfgOverride || new ThermostatConfiguration(heatingRange, coolingRange, "Heating", 1, 2000, 5, tickDelay, 5000);

        tempSensor = new MockTempSensor(tickDelay);
        tempRdr = new MovingAverageTempReader(tempSensor, windowSize);
        furnaceTrigger = new FurnaceTrigger();
        acTrigger = new AcTrigger();
        thermostat = new Thermostat(cfg, tempRdr, furnaceTrigger, acTrigger);
		if(mode) {
        	thermostat.setMode(mode);
		}
        
        return thermostat;
    }

    function buildRunningThermostat(mode: ThermostatMode, autoStart: boolean = true): Rx.Observable<Thermostat> {
        let observable = Rx.Observable.create((observer: Rx.Observer<Thermostat>) => {
            buildThermostat(mode);

			thermostat.setTarget(70);

			let trigger = mode == ThermostatMode.Heating ? furnaceTrigger : acTrigger;
			sinon.stub(trigger, 'start', () => {
				observer.next(thermostat);
				observer.complete();
			});

			sinon.stub(tempSensor, 'pollSensor', () => {
				return thermostat.mode == ThermostatMode.Heating ? thermostat.target - 5 : thermostat.target + 5;
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
				let thisCfg = new ThermostatConfiguration(heatingRange, coolingRange, "Heating", 1, 2000, 5, tickDelay, 5000);
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
				let temperature$ = Rx.Observable.from([72,71,70,69,68]);
				thermostat.setTarget(70);

				sinon.stub(tempRdr, "start", () => temperature$);

				let startCalled: boolean = false;
				sinon.stub(furnaceTrigger, "start", () => {
					startCalled = true;
				});

				thermostat.start();

				temperature$.subscribe(
					null, null,
					() => {
						expect(startCalled).to.be.true;
						done();
					}
				)
			});
		});

		describe('temperature staying above target', () => {
			it('should not start furnace', (done) => {
				let temperature$ = Rx.Observable.from([71,70,70,70,71,70,70,72,71]);
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
				)
			});
		});

		describe.skip('starting furnace', () => {
			it('should overshoot temperature', (done) => {

			});
		});

		describe('temperature rising above target + overshoot temp', () => {
			it('should stop furnace', (done) => {
				let temperature$ = Rx.Observable.from([67,68,69,70,71,72,73,74,75,76,77]);
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
				)
			});
		});
	});


	describe('air conditioning spec', () => {
		beforeEach(() => {
			thermostat.setMode(ThermostatMode.Cooling);
		});

		describe('temperature rising above target', () => {
			it('should start air conditioner', (done) => {
				let temperatureValues = [69,70,71,72];
				thermostat.setTarget(70);

				sinon.stub(tempRdr, "start", () => Rx.Observable.from(temperatureValues));
				sinon.stub(acTrigger, "start", done());

				thermostat.start();
			});
		});

		describe('temperature staying at or below target', () => {
			it('should not start air conditioner', (done) => {
				let obs = Rx.Observable.from([71,70,69,70,71,70,70,72,73,72,71]);
				
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
				let obs = Rx.Observable.from([77,76,75,74,73,72,71,70,69,68,67,66,65]);
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
				)
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

				sinon.stub(tempRdr, "start", () => Rx.Observable.interval(1).map(() => 65));
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
							return 65;
						}
						else {
							//started but not stopped yet
							return 75;
						}
					}
					
					return 65;
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

				sinon.stub(tempRdr, "start", () => Rx.Observable.interval(1).map(() => 75));
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
							return 75;
						}
						else {
							//started but not stopped yet
							return 65;
						}
					}
					
					return 75;
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
					if(e.topic.length == 2 &&
						e.topic[0] == 'thermostat' &&
						e.topic[1] == 'furnace' &&
						e.message == 'on') {
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
						if(e.topic.length == 2 &&
							e.topic[0] == 'thermostat' &&
							e.topic[1] == 'furnace' &&
							e.message == 'off') {
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
					if(e.topic.length == 2 &&
							e.topic[0] == 'thermostat' &&
							e.topic[1] == 'ac' &&
							e.message == 'on') {
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
						if(e.topic.length == 2 &&
							e.topic[0] == 'thermostat' &&
							e.topic[1] == 'ac' &&
							e.message == 'off') {
								done();
						}
					}); 
					(<any>thermostat).stopTrigger();
				}); 
			});
		});

		describe('when thermostat is running, it', () => {

			it('should emit a temperature message at the appropriate interval', (done) => {
				//clock = sinon.useFakeTimers();
				
				let tempEmitDelay = 50;
				let iterations = 5;
				
				buildRunningThermostat(ThermostatMode.Heating, true).subscribe((runningThermostat) => {
					runningThermostat.configuration.tempEmitDelay = tempEmitDelay;
					let lastNow: number = null;
					let msgCount = 0;
					let received: boolean = false;
					let subscription: Rx.Subscription;
					subscription = runningThermostat.eventStream.subscribe((e: IThermostatEvent) => {

						if(e.topic.length == 3 &&
							e.topic[0] == 'sensors' &&
							e.topic[1] == 'temperature' &&
							e.topic[2] == 'thermostat') {
								let now: number = Date.now();
								if(lastNow != null) {
									let diff = Math.abs(now - lastNow);
									expect(diff).to.be.within(0, 5);
								}

								lastNow = now;
								msgCount++;

								if(msgCount >= iterations) {
									done();
									subscription.unsubscribe();
								}
						}
					}); 

					runningThermostat.start();

					//clock.tick(tempEmitDelay*iterations);
					//done();
				}); 
			});
		});

		describe('when target is changed, it', () => {
			it('should emit a "target changed" message', (done) => {

				buildThermostat(ThermostatMode.Heating);
				
				let newTarget = thermostat.target + 2;

				thermostat.eventStream.subscribe((e: IThermostatEvent) => {
					if(e.topic.length == 2 &&
						e.topic[0] == 'thermostat' &&
						e.topic[1] == 'target') {
							expect(e.message).to.equal(newTarget.toString());
							done();
					}
				}); 
				
				thermostat.setTarget(newTarget);
			});
		});

		describe('when target is set to the current value, it', () => {
			it('should not emit a "target changed" message', (done) => {
				clock = sinon.useFakeTimers();
				buildThermostat(ThermostatMode.Heating);

				let newTarget = thermostat.target;

				thermostat.eventStream.subscribe((e: IThermostatEvent) => {
					if(e.topic.length == 2 &&
						e.topic[0] == 'thermostat' &&
						e.topic[1] == 'target') {
							throw new Error('Received thermostat/target message when not expected');
					}
				}); 
				
				thermostat.setTarget(newTarget);

				clock.tick(500);

				done();
			});
		});
	});
});