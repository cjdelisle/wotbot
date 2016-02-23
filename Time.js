
var SEC_MS = module.exports.SEC_MS = 1000;
var MIN_MS = module.exports.MIN_MS = SEC_MS * 60;
var HOUR_MS = module.exports.HOUR_MS = MIN_MS * 60;
var DAY_MS = module.exports.DAY_MS = HOUR_MS * 24;
var WEEK_MS = module.exports.WEEK_MS = DAY_MS * 7;

var now = module.exports.now = function () { return (new Date()).getTime(); };

var formatTimespan = module.exports.formatTimespan = function (timeSpan) {
    var d = Math.floor(timeSpan / DAY_MS);
    timeSpan -= d * DAY_MS;
    var h = Math.floor(timeSpan / HOUR_MS);
    timeSpan -= h * HOUR_MS;
    var m = Math.floor(timeSpan / MIN_MS);
    timeSpan -= m * MIN_MS;
    var s = Math.floor(timeSpan / SEC_MS);
    return d + 'd ' + h + 'h ' + m + 'm ' + s + 's';
};
