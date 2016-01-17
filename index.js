var irc = require("irc"),
    mis = require("mis"),
    lib = require("./lib/index"),
    fs = require("fs"),
    agml = require("agml"),
    levelup = require("levelup");

var config = {},
    network = {};

(function () {
    var tmp=[];

    agml.parse(fs.readFileSync('./config.agml', 'utf-8'), tmp);

    // bools
    ['debug', 'floodProtection', 'autoRejoin', 'autoConnect']
        .forEach(function (k) {
            config[k] = tmp[0][k] === 'true';
        });

    // ints
    ['floodProtectionDelay']
        .forEach(function (k) {
            config[k] = parseInt(tmp[0][k]);
        });

    // split strings
    config.channels = tmp[0].channels.trim().split(/\s+/);

    // plain old strings
    ['userName']
        .forEach(function (k) {
            config[k] = tmp[0][k].trim();
        });

    /* Now network things... */
    network.nick = tmp[1].nick;
    network.domain = tmp[1].domain;
}());

global.logStream = fs.createWriteStream(
    './log/trust.db',
    {flags: 'a'});

var bot = new irc.Client(
    network.domain,
    network.nick,
    config);

var en = mis();

en('unhandledException', function (e) {
    console.error(e);
});

lib.wrapHooks(bot, en);

console.log(Object.keys(en().stacks));

Object.keys(en().stacks)
    .forEach(function (k) {
        en(k, function (args) {
            console.log('\n>' + k);
        });

        en(k, function (args) {
            fs.readFile('./hooks/' + k +'.js', 'utf-8', function (e, out) {
                if (e) {
                    console.error(e);
                } else {
                    try {
                        eval(out);
                    } catch (err) {
                        console.error(err);
                    }
                }
            });
        });
    });

module.exports = en;
