import * as cron from 'cron';

import { IScheduleConfiguration, IScheduleItem, IWeeklySchedule } from './configuration';
import { ThermostatMode } from "../../../common/thermostatMode";

export interface IScheduler {
	initSchedule: {(mode: ThermostatMode, callback: {(temperature)})};
}

export class Scheduler implements IScheduler {
	private _currentWeeklySchedule: IWeeklySchedule;
	private _cronJobs: cron.CronJob[];

	constructor(private _schedule: IScheduleConfiguration) {
		this._cronJobs = [];
	}

	initSchedule(mode: ThermostatMode, callback: {(temperature): void}) {
		this.clearExistingJobs();
		this._currentWeeklySchedule = mode === ThermostatMode.Heating ?
							this._schedule.heating : this._schedule.cooling;

		this._currentWeeklySchedule.weekdays.forEach((item) => {
			this.initCronJob(item, 'MON-FRI', callback);
		});

		this._currentWeeklySchedule.weekends.forEach((item) => {
			this.initCronJob(item, 'SAT,SUN', callback);
		});
	}

	private clearExistingJobs() {
		this._cronJobs.forEach((cronJob) => {
			cronJob.stop();
		});
		this._cronJobs = [];
	}

	private initCronJob(item: IScheduleItem, days: string, callback: {(temperature): void}) {
		let cronJob = new cron.CronJob({
			cronTime: this.buildCronString(item.time, days),
			onTick: () => {
				callback(item.temperature);
			},
			start: true,
			timeZone: this._schedule.timezone
		});

		this._cronJobs.push(cronJob);
	}
	
	private buildCronString(strTime: string, dayOfWeek: string) {
		let splitStr = strTime.split(':');
		let hour = splitStr[0];
		let minutes = splitStr[1];

		return `0 ${minutes} ${hour} * * ${dayOfWeek}`;
	}

	
}