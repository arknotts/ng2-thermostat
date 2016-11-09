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

	scheduleNext(now: Date, callback: {(temperature): void}) {
		let day = now.getDay();
		let hour = now.getHours();
		let isWeekend = (day == 6) || (day == 0);
		let scheduleItems = isWeekend ? this._schedule.weekends : this._schedule.weekdays;

		
		if(day == 0) {
			scheduleItems = scheduleItems.concat(this._schedule.weekdays);
		}
		else if(day == 5) {
			scheduleItems = scheduleItems.concat(this._schedule.weekends);
		}

		

		// function scheduleNext(temperature: number, millisecondsToDelay: number) {
		// 	setTimeout(() => {
		// 		this.thermostat.setTarget(temperature);
		// 		this.scheduleNextTemperatureChange();
		// 	}, millisecondsToDelay);
		// }
		
		scheduleItems.every((item) => {
			let itemTime = parseTime(item.time);

			if(itemTime > now) {
				let millisecondsToDelay = (itemTime.getTime() - now.getTime());
				callback(item.temperature);
				return false;
			}
		});
	}

	
}