import * as cron from 'cron';

import { IScheduleConfiguration, IScheduleItem } from './configuration';

export interface IScheduler {
	initSchedule: {(callback: {(temperature)})};
}

export class Scheduler implements IScheduler {
	constructor(private _schedule: IScheduleConfiguration) {}

	initSchedule(callback: {(temperature): void}) {
		this._schedule.weekdays.forEach((item) => {
			this.initCronJob(item, 'MON-FRI', callback);
		});

		this._schedule.weekends.forEach((item) => {
			this.initCronJob(item, 'SAT,SUN', callback);
		});
	}

	private initCronJob(item: IScheduleItem, days: string, callback: {(temperature): void}) {
		new cron.CronJob({
			cronTime: this.buildCronString(item.time, days),
			onTick: () => {
				callback(item.temperature);
			},
			start: true,
			timeZone: this._schedule.timezone
		});
	}
	
	private buildCronString(strTime: string, dayOfWeek: string) {
		let splitStr = strTime.split(':');
		let hour = splitStr[0];
		let minutes = splitStr[1];

		return `0 ${minutes} ${hour} * * ${dayOfWeek}`;
	}

	
}