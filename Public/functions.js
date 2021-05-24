exports = module.exports = {};

function minTwoDigits(n) {
    return (n < 10 ? '0' : '') + n;
}

function formatDuration(schedule) {
    return new Date(schedule.duration * 1000).toISOString().substr(11, 8);
}

exports.formatTime = function(schedule, report) {
    
    let time = minTwoDigits(schedule.hour) + ":" + minTwoDigits(schedule.minute) + " - " + minTwoDigits(schedule.hourEnd) + ":" + minTwoDigits(schedule.minuteEnd);
    let date = minTwoDigits(schedule.day) + "." + minTwoDigits(report.month);
    let duration = formatDuration(schedule);
    
    return date + "\t\t" + time + "\t\tCałkowity czas: " + duration;
}


exports.splitByDay = function(report) {
    let schedules = report.schedules;

    let outSchedules = [];
    for(let i = 0 ; i < schedules.length ; i++) {
        if(outSchedules.length > 0 && outSchedules[outSchedules.length - 1].dayStart == schedules[i].day) {
            outSchedules[outSchedules.length - 1].schedules.push(schedules[i]);
        } else {
            outSchedules.push({
                dayStart: schedules[i].day,
                schedules: [schedules[i]]
            });
        }
    }
    return outSchedules;
}
