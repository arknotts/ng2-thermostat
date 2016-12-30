import * as chai from 'chai';
import * as sinon from 'sinon';
import { Subject } from 'rxjs';

import { ThermostatMode } from '../../../common/thermostatMode';
import { IThermostatEvent, ThermostatEventType } from '../../../common/thermostatEvent';
import { ThermostatTopic } from '../../../common/thermostatEvent';

import { IThermostat } from '../core/thermostat';

import { ThermostatServer } from './thermostatServer';
import { IBroadcaster } from './broadcaster';
import { IScheduler } from './schedule';

interface IMockSocketEvent {
	key: string;
	callback: {(data?: any)};
}

describe('Thermostat Server Spec', () => {
	let server: ThermostatServer;
	let mockThermostat: IThermostat;
	let mockIo: any;
	let mockBroadcaster: IBroadcaster;
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

		mockBroadcaster = {
			connect: sinon.spy(),
			broadcast: sinon.spy()
		};

		onScheduleCallback = sinon.spy();
		mockScheduler = {
			initSchedule: (callback) => {
				onScheduleCallback = callback;
			}
		};

		server = new ThermostatServer(mockIo, mockThermostat, mockBroadcaster, mockScheduler);
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

	it('should broadcast thermostat events', () => {
		let event: any = {topic: []};
		mockEventStream.next(event);

		sinon.assert.calledOnce(<any>mockBroadcaster.broadcast);
		sinon.assert.calledWith(<any>mockBroadcaster.broadcast, event);
	});

	it('should emit latest thermostat values on new socket connection', () => {
		let temperature = 73;
		mockEventStream.next({ //need to push a temperature through before we can get it back out
			type: ThermostatEventType.Message,
			topic: ThermostatTopic.Temperature,
			message: temperature.toString(),
		});
		onConnectionCallback(mockSocket);

		sinon.assert.calledWith(mockSocket.send, {
			type: ThermostatEventType.Message,
			topic: ThermostatTopic.Target,
			message: mockThermostat.target.toString(),
		});
		sinon.assert.calledWith(mockSocket.send, {
			type: ThermostatEventType.Message,
			topic: ThermostatTopic.Temperature,
			message: temperature.toString(),
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