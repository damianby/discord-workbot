exports = module.exports = {};

function minTwoDigits(n) {
	return (n < 10 ? '0' : '') + n;
}

function formatDuration(schedule) {
	return new Date(schedule.duration * 1000).toISOString().substr(11, 8);
}

exports.formatToMonthHours = function(duration) {
	let totalHours = duration / 60 / 60;

	let hours = Math.floor(totalHours);

	let minutes = Math.round((totalHours - hours) * 60);

	return hours + ' godzin  ' + minutes + ' minut';
}

exports.secondsToTime = function(seconds) {
	return new Date(seconds * 1000).toISOString().substr(11, 8);
}

exports.formatTime = function(schedule, report) {

	let time = minTwoDigits(schedule.hour) + ':' + minTwoDigits(schedule.minute) + ' - ' + minTwoDigits(schedule.hourEnd) + ':' + minTwoDigits(schedule.minuteEnd);
	let date = minTwoDigits(schedule.day) + '.' + minTwoDigits(report.month);
	let duration = formatDuration(schedule);

	return date + '\t\t' + time + '\t\tCałkowity czas: ' + duration;
};


exports.reparseDaysAndDurations = function(report) {
	let schedules = report.schedules;

	let totalMonthDuration = 0;
	let outSchedules = [];
	for(let i = 0 ; i < schedules.length ; i++) {
		if(outSchedules.length > 0 && outSchedules[outSchedules.length - 1].dayStart == schedules[i].day) {
			const currentSchedule = outSchedules[outSchedules.length - 1];
			currentSchedule.totalDuration += schedules[i].duration;
			currentSchedule.schedules.push(schedules[i]);
		} else {
			outSchedules.push({
				dayStart: schedules[i].day,
				totalDuration: schedules[i].duration,
				schedules: [schedules[i]],
			});
		}
		totalMonthDuration += schedules[i].duration;
	}
	report.totalMonthDuration = totalMonthDuration;

	report.schedules = outSchedules;
	return report;
};
