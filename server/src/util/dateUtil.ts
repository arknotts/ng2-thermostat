export function parseTime(strTime: string) {
	let colonIdx = strTime.indexOf(':');
	let hour = parseInt(strTime.substr(0, colonIdx));
	let minutes = parseInt(strTime.substr(colonIdx));

	let date = new Date();
	date.setHours(hour, minutes);
	return date;
}