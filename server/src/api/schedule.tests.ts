import * as chai from 'chai';
import * as sinon from 'sinon';
var expect = chai.expect;

import { parseTime } from '../util/dateUtil';

import { ISchedule, Scheduler } from './schedule';

describe('Schedule Unit Tests:', () => {
	let schedule: ISchedule;
	let scheduler: Scheduler;
	let clock;

	beforeEach(() => {
		schedule = {
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

		scheduler = new Scheduler(schedule);
		clock = sinon.useFakeTimers();
	});

	afterEach(() => {
		clock.restore();
	});

	it('should schedule next change by the difference between the current time and the next schedule time', (done) => {
		let currScheduleItem = schedule.weekdays[1];
		let nextScheduleItem = schedule.weekdays[2];

		let now = parseTime(currScheduleItem.time);
		console.log('now', now);
		now = now.addHours(1);
		let oneSecondBeforeNextSchedule = parseTime(nextScheduleItem.time).addSeconds(-1);
					
		let callback = sinon.spy();
		scheduler.scheduleNext(now, callback);

		clock.tick(oneSecondBeforeNextSchedule.getTime() - now.getTime());
		expect(callback.notCalled);
		clock.tick(2);
		expect(callback.called);
		expect(callback.calledWith(nextScheduleItem.temperature));
	});

	it.skip('should schedule next change from beginning of weekday schedule after last change on any weekday but Friday', (done) => {

	});

	it.skip('should schedule next change from beginning of weekend schedule after last change on Saturday', (done) => {

	});

	it.skip('should schedule next change from the weekday schedule after last change on a Sunday', (done) => {

	});

	it.skip('should schedule next change from the weekend schedule after last change on a Friday', (done) => {

	});
});