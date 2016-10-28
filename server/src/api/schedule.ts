export interface IScheduleItem {
	time: number;
	temperature: number;
}

export interface ISchedule {
	weekdays: Array<IScheduleItem>;
	weekends: Array<IScheduleItem>;
}