var Fs = require('fs');

var IP_REGEX = /^fc[a-f0-9]{2}:/;

var validate = module.exports.validate = function (json) {
    if (!json) { return false; }
    if (json.command === 'itrust') {
        if (json.src === json.dest) { return false; }
        if (!(IP_REGEX.test(json.dest))) { return false; }
        if (!(IP_REGEX.test(json.src))) { return false; }
        if (typeof(json.trust) !== 'number') { return false; }
        if (json.trust < 0 || json.trust > 100) { return false; }
    } else if (json.command === 'referendum') {
        // no verification yet
    } else {
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
