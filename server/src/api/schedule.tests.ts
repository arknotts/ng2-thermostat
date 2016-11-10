import * as chai from 'chai';
import * as sinon from 'sinon';
var expect = chai.expect;

import * as moment from 'moment';
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

		let now = parseTime(currScheduleItem.time).add(1, 'hour');
		let oneMsBeforeNextSchedule = parseTime(nextScheduleItem.time).subtract(1, 'ms');
					
		let callback = sinon.spy();
		scheduler.scheduleNext(now, callback);

		clock.tick(oneMsBeforeNextSchedule.valueOf() - now.valueOf());
		expect(callback.notCalled).to.be.true;
		clock.tick(2);
		expect(callback.called).to.be.true;
		expect(callback.calledWith(nextScheduleItem.temperature)).to.be.true;
		done();
	});

	it.only('should schedule next change from beginning of weekday schedule after last change on any weekday but Friday', (done) => {
		let currScheduleItem = schedule.weekdays[schedule.weekdays.length-1];
		let nextScheduleItem = schedule.weekdays[0];

		let raw = parseTime(currScheduleItem.time);
		let now = parseTime("3:05");
		//let now = parseTime(currScheduleItem.time);//.day(2).add(1, 'minutes');
		let raw2 = parseTime(nextScheduleItem.time);
		//let oneMsBeforeNextSchedule = parseTime(nextScheduleItem.time).add(1, 'days').subtract(1, 'ms');
		let oneMsBeforeNextSchedule = parseTime(nextScheduleItem.time).subtract(1, 'ms');
					
		let callback = sinon.spy();
		scheduler.scheduleNext(now, callback);

		clock.tick(oneMsBeforeNextSchedule.valueOf() - now.valueOf());
		expect(callback.notCalled).to.be.true;
		clock.tick(2);
		expect(callback.called).to.be.true;
		expect(callback.calledWith(nextScheduleItem.temperature)).to.be.true;
		done();
	});

	it.skip('should schedule next change from beginning of weekend schedule after last change on Saturday', (done) => {

	});

	it.skip('should schedule next change from the weekday schedule after last change on a Sunday', (done) => {

	});

	it.skip('should schedule next change from the weekend schedule after last change on a Friday', (done) => {

	});
});