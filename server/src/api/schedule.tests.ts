import * as chai from 'chai';
import * as sinon from 'sinon';
var expect = chai.expect;

import { IScheduleConfiguration, IScheduleItem } from './configuration';
import { Scheduler } from './schedule';

describe('Schedule Unit Tests:', () => {
	const DATE_MONDAY: Date = new Date(2016, 10, 14);
	const DATE_SATURDAY: Date = new Date(2016, 10, 19);

	let scheduleConfig: IScheduleConfiguration;
	let scheduler: Scheduler;
	let clock: sinon.SinonFakeTimers;
	let callback: sinon.SinonSpy;

	beforeEach(() => {
		scheduleConfig = {
			timezone: 'America/New_York',
			weekdays: [
				{ time: "6:00", temperature: 68 },
				{ time: "7:30", temperature: 63 },
				{ time: "16:00", temperature: 68 },
				{ time: "22:00", temperature: 63 }
			],
			weekends: [
				{ time: "7:00", temperature: 68 },
				{ time: "22:00", temperature: 63 }
			]
		};

		scheduler = new Scheduler(scheduleConfig);
	});

	afterEach(() => {
		if(clock) {
			clock.restore();
		}
	});

	it('should schedule all weekday temperature changes for every weekday', (done) => {
		clock = sinon.useFakeTimers(DATE_MONDAY.getTime());
		testSchedule(scheduleConfig.weekdays);
		done();
	});

	it('should schedule all weekend temperature changes for Saturday and Sunday', (done) => {
		clock = sinon.useFakeTimers(DATE_SATURDAY.getTime());
		testSchedule(scheduleConfig.weekends);
		done();
	});

	function testSchedule(scheduleItems: IScheduleItem[]) {
		callback = sinon.spy();
		scheduler.initSchedule(callback);

		let callCount = 0;
		let lastItemMillis: number = 0;
		scheduleItems.forEach((item) => {
			let thisItemMillis = parseHours(item.time) * 60 * 60 * 1000 + parseMinutes(item.time) * 60 * 1000;
			
			clock.tick(thisItemMillis - lastItemMillis - 1);
			sinon.assert.callCount(callback, callCount);
			clock.tick(1);
			expect(callback.getCall(callCount).calledWith(item.temperature)).to.be.true;
			callCount++;
			sinon.assert.callCount(callback, callCount);
			
			lastItemMillis = thisItemMillis;
		});
	}

	function parseHours(strTime: string): number {
		return parseInt(strTime.split(':')[0]);
	}

	function parseMinutes(strTime: string): number {
		return parseInt(strTime.split(':')[1]);
	}
});