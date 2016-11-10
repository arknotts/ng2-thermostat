import * as moment from 'moment';
import { parseTime } from '../util/dateUtil';

export interface IScheduleItem {
	time: string;
	temperature: number;
}

export interface ISchedule {
	weekdays: Array<IScheduleItem>;
	weekends: Array<IScheduleItem>;
}

export class Scheduler {
	constructor(private _schedule: ISchedule) {}

	scheduleNext(now: moment.Moment, callback: {(temperature): void}) {
		let day = now.day();
		let hour = now.hours();
		let isWeekend = (day == 6) || (day == 0);
		let scheduleItems = isWeekend ? this._schedule.weekends : this._schedule.weekdays;

		let followingDayScheduleItem: IScheduleItem;
		if(isWeekend) {
			if(day == 0) { //Sunday
				followingDayScheduleItem = this._schedule.weekdays[0];
			}
			else { //Saturday
				followingDayScheduleItem = this._schedule.weekends[0];
			}
		}
		else { //weekday
			if(day == 5) { //Friday
				followingDayScheduleItem = this._schedule.weekends[0];
			}
			else { //any other weekday
				followingDayScheduleItem = this._schedule.weekdays[0];
			}
		}
		
		scheduleItems.push(followingDayScheduleItem);

		
		scheduleItems.every((item, idx) => {
			let itemTime = parseTime(item.time);

			if(idx == scheduleItems.length - 1) { //default to following day
				itemTime = itemTime.add(1, 'days');
			}
			
			if(itemTime.valueOf() > now.valueOf()) {
				let millisecondsToDelay = (itemTime.valueOf() - now.valueOf());
				setTimeout(() => {
					callback(item.temperature);
				}, millisecondsToDelay);
				return false;
			}

			return true;
		});
	}

	
}