var irc = require("irc");
var mis = require("mis");
var lib = require("./lib/index");
var Fs = require("fs");
var agml = require("agml");
var Karma = require('./karma.js');
var TrustDB = require('./trustdb.js');
var nThen = require('nthen');
var Vote = require('./Vote');

var DB_FILE = './test/trust.db';
var LAG_MAX_BEFORE_DISCONNECT = 256000;

var config = {},
    network = {};

(function () {
    var tmp=[];

    agml.parse(Fs.readFileSync('./config.agml', 'utf-8'), tmp);

    // bools
    ['debug', 'floodProtection', 'autoRejoin', 'autoConnect', 'trustee']
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
    network.trigger = tmp[1].trigger || '.';
}());

TrustDB.open(DB_FILE, function (err, state) {
    if (err) { throw err; }

    var bot = new irc.Client(network.domain, network.nick, config);

    setInterval(function () {
        if ((new Date().getTime()) - state.timeOfLastMsg > LAG_MAX_BEFORE_DISCONNECT) {
            console.log("Lag out");
            process.exit(1);
        }
    }, 1000);

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
                state.timeOfLastMsg = (new Date()).getTime();
            });

            en(k, function (args) {
                Fs.readFile('./hooks/' + k +'.js', 'utf-8', function (e, out) {
                    if (e) {
                        console.error(e);
                    } else {
                        try {
                            /* jshint -W061 */ // Suppress jshint warning
                            eval(out);
                        } catch (err) {
                            console.error(err.stack);
                            console.error(err);
                        }
                    }
                });
            });
        });

    module.exports = en;

});
