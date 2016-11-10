import * as moment from 'moment';

export function parseTime(strTime: string): moment.Moment {
	let colonIdx = strTime.indexOf(':');
	let hour = parseInt(strTime.substr(0, colonIdx));
	let minutes = parseInt(strTime.substr(colonIdx+1));

	return moment().set('hour', hour).set('minute', minutes);
}