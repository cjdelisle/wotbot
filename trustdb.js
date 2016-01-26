var Fs = require('fs');

var IP_REGEX = /([a-f0-9]{1,4}:){2,}/;

var readFile = module.exports.readFile = function (fileName, cb) {
    Fs.readFile(fileName, function (err, ret) {
        if (err) {
            cb(err);
            return;
        }
        var out;
        try {
            out = ret
                .toString('utf8')
                .split("\n")
                .filter(function (line) { return line; })
                .map(function (line) {
                    try { return JSON.parse(line); } catch (err) { }
                    return null;
                })
                .filter(function (line) {
                    if (!line) { return false; }
                    if (!(IP_REGEX.test(line.dest))) { return false; }
                    if (!(IP_REGEX.test(line.src))) { return false; }
                    if (typeof(line.trust) !== 'number' || line.trust < 0 || line.trust > 100) { return false; }
                    return line.trust > 0 && line.trust < 100;
                });
        } catch (e) { cb(e); return; }
        cb(undefined, out);
    });
};
