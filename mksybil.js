var Crypto = require('crypto');

var mkIp = function () {
    var buff = Crypto.randomBytes(16).toString('hex');
    buff = buff.replace(/([0-9a-f]{4})/g, function (all, block) { return block + ':'; });
    buff = buff.replace(/^[0-9a-f]{2}/, 'fc').slice(0, -1);
    return buff;
};

//{"command":"itrust","src":"fca8:2dd7:4987:a9be:c8fc:34d7:5a1:4606","srcNick":"jercos","dest":"fc92:8136:dc1f:e6e0:4ef6:a6dd:7187:b85f","destNick":"cjd","trust":49,"time":1455225538309}

var now = function () { return (new Date()).getTime(); };

var mkEntries = function (count) {
    var i = 0;
    var ips = (new Array(count)).fill().map(function () {
        return { ip: mkIp(), nick: 'bot' + i++ };
    });
    ips.forEach(function (ipA) {
        ips.forEach(function (ipB) {
            if (ipB === ipA) { return; }
            var line = {
                command: "itrust",
                src: ipA.ip,
                srcNick: ipA.nick,
                dest: ipB.ip,
                destNick: ipB.nick,
                trust: 100,
                time: now()
            };
            console.log(JSON.stringify(line));
        });
    });
};

mkEntries(2);
