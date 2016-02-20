var Fs = require('fs');

var IP_REGEX = /^fc[a-f0-9]{2}:/;

var isInt = function (x) {
    return (typeof(x) === 'number' && !isNaN(x) && x === Math.floor(x));
};

var _validate = function (json) {
    if (!json) { return false; }
    if (!(IP_REGEX.test(json.src))) { return false; }
    if (!json.srcNick) { return false; }
    if (!isInt(json.time)) { return false; }
    if (json.command === 'itrust') {
        if (json.src === json.dest) { return false; }
        if (!(IP_REGEX.test(json.dest))) { return false; }
        if (typeof(json.trust) !== 'number') { return false; }
        if (json.trust < 0 || json.trust > 100) { return false; }
    } else if (json.command === 'referendum') {
        if (typeof(json.options) !== 'object' || !Array.isArray(json.options)) { return false; }
        if (!isInt(json.num)) { return false; }
    } else if (json.command === 'vote') {
        if (typeof(json.choices) !== 'object' || !Array.isArray(json.choices)) { return false; }
        if (typeof(json.num) !== 'string' || json.num.length < 2) { return false; }
        if (json.num[0] !== 'r') { return false; }
        if (!isInt(Number(json.num.substring(1)))) { return false; }
    } else {
        return false;
    }
    return true;
};
var validate = module.exports.validate = function (json) {
    if (!_validate(json)) {
        //console.log('validation of ' + JSON.stringify(json) + ' failed');
        return false;
    }
    return true;
};

var parse = module.exports.parse = function (str) {
    return str.split("\n")
        .filter(function (line) { return line[0] === '{'; })
        .map(function (line) {
            try { return JSON.parse(line); } catch (err) { }
            return null;
        }).filter(validate);
};

var readFile = module.exports.readFile = function (fileName, cb) {
    Fs.readFile(fileName, function (err, ret) {
        if (err) {
            cb(err);
            return;
        }
        var out;
        try {
            out = parse(ret.toString('utf8'));
        } catch (e) { cb(e); return; }
        cb(undefined, out);
    });
};
