import * as cron from 'cron';

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

	initSchedule(callback: {(temperature): void}) {
		this._schedule.weekdays.forEach((item) => {
			new cron.CronJob(this.buildCronString(item.time, '1-5'), () => {
				callback(item.temperature);
			}).start();
		});

		this._schedule.weekends.forEach((item) => {
			new cron.CronJob(this.buildCronString(item.time, '6-7'), () => {
				callback(item.temperature);
			}).start();
		});
	}
	
	private buildCronString(strTime: string, dayOfWeek: string) {
		let splitStr = strTime.split(':');
		let hour = splitStr[0];
		let minutes = splitStr[1];

		return `0 ${minutes} ${hour} * * ${dayOfWeek}`;
	}

	
}