import * as chai from 'chai';
import * as sinon from 'sinon';
import { Subject } from 'rxjs';

import { ThermostatMode } from '../../../common/thermostatMode';
import { IThermostatEvent, ThermostatEventType } from '../../../common/thermostatEvent';
import { THERMOSTAT_TOPIC } from '../../../common/thermostatEvent';

import { IThermostat } from '../core/thermostat';

import { ThermostatServer } from './thermostatServer';
import { IIoTBridge } from './iotBridge';
import { IScheduler } from './schedule';

interface IMockSocketEvent {
	key: string;
	callback: {(data?: any)};
}

describe('Thermostat Server Spec', () => {
	let server: ThermostatServer;
	let mockThermostat: IThermostat;
	let mockIo: any;
	let mockIoTBridge: IIoTBridge;
	let mockScheduler: IScheduler;
	let mockSocket: any;
	let onConnectionCallback: {(socket)};
	let onScheduleCallback: {(temperature)};
	let mockSocketEvents: Array<IMockSocketEvent>; 
	let mockEventStream: Subject<IThermostatEvent>;

	beforeEach(() => {
		mockEventStream = new Subject<IThermostatEvent>();
		mockSocketEvents = new Array<IMockSocketEvent>();

		mockThermostat = {
			mode: ThermostatMode.Heating,
			eventStream: mockEventStream,
			target: 70,
			start: sinon.spy(),
			stop: sinon.spy(),
			startFan: sinon.spy(),
			stopFan: sinon.spy(),
			isRunning: sinon.spy(),
			setTarget: sinon.spy(),
			setMode: sinon.spy()
		};

		mockIo = {
			on: (event: string, callback: {(socket)}) => {
				onConnectionCallback = callback;
				callback(mockSocket);
			},
			sockets: {
				send: sinon.spy()
			}
		};

		mockSocket = {
			on: (event: string, callback: {(data: any)}) => {
				mockSocketEvents.push({
					key: event,
					callback: callback
				});
			},
			send: sinon.spy()
		};

		mockIoTBridge = {
			connect: sinon.spy(),
			broadcast: sinon.spy(),
			events$: new Subject<IThermostatEvent>()
		};

		onScheduleCallback = sinon.spy();
		mockScheduler = {
			initSchedule: (callback) => {
				onScheduleCallback = callback;
			}
		};

		server = new ThermostatServer(mockIo, mockThermostat, mockIoTBridge, mockScheduler);
		server.start();

		//reset call count on thermostat.start() since the server will have automatically started it
		(<Sinon.SinonSpy>mockThermostat.start).reset();
	});

	it('should start thermostat when server is started', () => {
		server.start();

		sinon.assert.calledOnce(<any>mockThermostat.start);
	});

	it('should emit thermostat events on every socket', () => {
		let event: any = {topic: []};
		mockEventStream.next(event);

		sinon.assert.calledOnce(mockIo.sockets.send);
		sinon.assert.calledWith(mockIo.sockets.send, event);
	});

	it('should broadcast thermostat temperature events as an object', () => {
		let event: IThermostatEvent = {
			type: ThermostatEventType.Message,
			topic: THERMOSTAT_TOPIC.Temperature,
			message: {
				temperature: 72
			}
		};
		mockEventStream.next(event);

		sinon.assert.calledOnce(<any>mockIoTBridge.broadcast);
		sinon.assert.calledWith(<any>mockIoTBridge.broadcast, event.topic, event.message);
	});
	

	it('should broadcast thermostat target events as an object', () => {
		let event: IThermostatEvent = {
			type: ThermostatEventType.Message,
			topic: THERMOSTAT_TOPIC.Target,
			message: '68'
		};
		mockEventStream.next(event);

		sinon.assert.calledOnce(<any>mockIoTBridge.broadcast);
		sinon.assert.calledWith(<any>mockIoTBridge.broadcast, event.topic, {
			target: parseInt(event.message)
		});
	});
	
	it('should broadcast thermostat mode events as an object', () => {
		let event: IThermostatEvent = {
			type: ThermostatEventType.Message,
			topic: THERMOSTAT_TOPIC.Mode,
			message: ThermostatMode.Cooling.toString()
		};
		mockEventStream.next(event);

		sinon.assert.calledOnce(<any>mockIoTBridge.broadcast);
		sinon.assert.calledWith(<any>mockIoTBridge.broadcast, event.topic, {
			mode: event.message
		});
	});

	it('should broadcast thermostat status events as an object', () => {
		let event: IThermostatEvent = {
			type: ThermostatEventType.Message,
			topic: THERMOSTAT_TOPIC.Status,
			message: 'some status message'
		};
		mockEventStream.next(event);

		sinon.assert.calledOnce(<any>mockIoTBridge.broadcast);
		sinon.assert.calledWith(<any>mockIoTBridge.broadcast, event.topic, {
			status: event.message
		});
	});

	it('should broadcast thermostat furnace events as an object', () => {
		let event: IThermostatEvent = {
			type: ThermostatEventType.Message,
			topic: THERMOSTAT_TOPIC.Furnace,
			message: 'on'
		};
		mockEventStream.next(event);

		sinon.assert.calledOnce(<any>mockIoTBridge.broadcast);
		sinon.assert.calledWith(<any>mockIoTBridge.broadcast, event.topic, {
			action: event.message
		});
	});

	it('should broadcast thermostat AC events as an object', () => {
		let event: IThermostatEvent = {
			type: ThermostatEventType.Message,
			topic: THERMOSTAT_TOPIC.Ac,
			message: 'on'
		};
		mockEventStream.next(event);

		sinon.assert.calledOnce(<any>mockIoTBridge.broadcast);
		sinon.assert.calledWith(<any>mockIoTBridge.broadcast, event.topic, {
			action: event.message
		});
	});

	it('should broadcast error events as an object', () => {
		let event: IThermostatEvent = {
			type: ThermostatEventType.Message,
			topic: THERMOSTAT_TOPIC.Error,
			message: 'some error'
		};
		mockEventStream.next(event);

		sinon.assert.calledOnce(<any>mockIoTBridge.broadcast);
		sinon.assert.calledWith(<any>mockIoTBridge.broadcast, event.topic, {
			error: event.message
		});
	});

	it('should listen to the iot bridge and forward messages to thermostat', () => {
		let incomingTarget = 74;
		let incomingMode = ThermostatMode.Cooling;

		(<Subject<IThermostatEvent>>mockIoTBridge.events$).next({
			topic: THERMOSTAT_TOPIC.TargetSet,
			type: ThermostatEventType.Message,
			message: {
				target: incomingTarget.toString()
			}
		});

		sinon.assert.calledWith(<any>mockThermostat.setTarget, incomingTarget);

		(<Subject<IThermostatEvent>>mockIoTBridge.events$).next({
			topic: THERMOSTAT_TOPIC.ModeSet,
			type: ThermostatEventType.Message,
			message: {
				mode: incomingMode.toString()
			}
		});

		sinon.assert.calledWith(<any>mockThermostat.setMode, incomingMode.toString());
	});

	it('should start and stop fan when message received from iot bridge', () => {
		(<Subject<IThermostatEvent>>mockIoTBridge.events$).next({
			topic: THERMOSTAT_TOPIC.FanSet,
			type: ThermostatEventType.Message,
			message: {
				fan: 'start'
			}
		});

		sinon.assert.called(<any>mockThermostat.startFan);

		(<Subject<IThermostatEvent>>mockIoTBridge.events$).next({
			topic: THERMOSTAT_TOPIC.FanSet,
			type: ThermostatEventType.Message,
			message: {
				fan: 'stop'
			}
		});

		sinon.assert.called(<any>mockThermostat.stopFan);
	});

	it('should emit latest thermostat values on new socket connection', () => {
		let temperature = 73;
		mockEventStream.next({ //need to push a temperature through before we can get it back out
			type: ThermostatEventType.Message,
			topic: THERMOSTAT_TOPIC.Temperature,
			message: {
				temperature: temperature,
			}
		});
		onConnectionCallback(mockSocket);

		sinon.assert.calledWith(mockSocket.send, {
			type: ThermostatEventType.Message,
			topic: THERMOSTAT_TOPIC.Target,
			message: mockThermostat.target.toString(),
		});
		sinon.assert.calledWith(mockSocket.send, {
			type: ThermostatEventType.Message,
			topic: THERMOSTAT_TOPIC.Temperature,
			message: {
				temperature: temperature,
			},
		});
	});

	it('should set thermostat target when scheduler fires', () => {
		let scheduleTemperature = 69;
		onScheduleCallback(scheduleTemperature);

		sinon.assert.calledWith(<any>mockThermostat.setTarget, scheduleTemperature);
	});

	it('should reset thermostat when reset command received', () => {
		mockSocketEvents.find((event) => event.key === '/reset').callback();
		
		sinon.assert.calledOnce(<any>mockThermostat.stop);
		sinon.assert.calledOnce(<any>mockThermostat.start);
	});

	it('should start fan on thermostat when start fan command received', () => {
		mockSocketEvents.find((event) => event.key === '/fan').callback('start');

		sinon.assert.calledOnce(<any>mockThermostat.startFan);
	});

	it('should stop fan on thermostat when stop fan command received', () => {
		mockSocketEvents.find((event) => event.key === '/fan').callback('stop');

		sinon.assert.calledOnce(<any>mockThermostat.stopFan);
	});

	it('should start thermostat when start command received', () => {
		mockSocketEvents.find((event) => event.key === '/start').callback();

		sinon.assert.calledOnce(<any>mockThermostat.start);
	});

	it('should set thermostat target when target command received', () => {
		let target = 74;
		mockSocketEvents.find((event) => event.key === '/target').callback({target: target});

		sinon.assert.calledWith(<any>mockThermostat.setTarget, target);
	});

	it('should set thermostat mode when mode command received', () => {
		let mode = ThermostatMode.Cooling;
		mockSocketEvents.find((event) => event.key === '/mode').callback({mode: mode});

		sinon.assert.calledWith(<any>mockThermostat.setMode, mode);
	});
});