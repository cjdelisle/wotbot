var Fs = require('fs');

var IP_REGEX = /^fc[a-f0-9]{2}:/;

var parse = module.exports.parse = function (str) {
    return str.split("\n")
        .filter(function (line) { return line[0] === '{'; })
        .map(function (line) {
            try { return JSON.parse(line); } catch (err) { }
            return null;
        })
        .filter(function (line) {
            if (!line) { return false; }
            if (line.command === 'itrust') {
                if (line.src === line.dest) { return false; }
                if (!(IP_REGEX.test(line.dest))) { return false; }
                if (!(IP_REGEX.test(line.src))) { return false; }
                if (typeof(line.trust) !== 'number') { return false; }
                if (line.trust < 0 || line.trust > 100) { return false; }
            } else if (line.command === 'referendum') {
                // no verification yet
            } else {
                return false;
            }
            return true;
        });
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
