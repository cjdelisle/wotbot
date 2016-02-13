var irc = require("irc");
var mis = require("mis");
var lib = require("./lib/index");
var Fs = require("fs");
var agml = require("agml");
var Karma = require('./karma.js');
var TrustDB = require('./trustdb.js');
var nThen = require('nthen');

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
}());

var state = {
    synced: false,
    syncing: false,
    error: null,
    onSync: [],
    whenSynced: null,
    trustList: [],
    referendums: [],
    karmas: null,
    karmaByAddr: null,
    logStream: Fs.createWriteStream(DB_FILE, {flags: 'a'}),
    timeOfLastPing = (new Date()).getTime()
};
var logToDb = state.logToDb = function (structure, cb) {
    var run = function () {
        if (state.syncing) {
            setTimeout(run, 1);
            return;
        }
        if (!TrustDB.validate(structure)) {
            cb("TrustDB.validate() failed");
            return;
        }
        if (structure.command === 'referendum') {
            state.referendums.push(structure);
        } else if (structure.command === 'itrust') {
            state.trustList.push(structure);
        } else {
            throw new Error();
        }
        state.logStream.write(JSON.stringify(structure)+"\n");
        state.synced = false;
        cb();
    };
    run();
};
var checkSync = function () {
    if (state.synced || state.syncing) { return; }
    state.syncing = true;
    var trustStr = JSON.stringify(state.trustList);
    var karmas;
    nThen(function (waitFor) {
        TrustDB.readFile(DB_FILE, waitFor(function (err, trusts) {
            if (err) { throw err; }
            trusts = trusts.filter(function (tr) { return (tr.command === 'itrust'); });
            console.log(JSON.stringify(trusts, null, '  '));
            console.log(JSON.stringify(state.trustList, null, '  '));
            if (trustStr !== JSON.stringify(trusts)) { throw new Error(); }
        }));
    }).nThen(function (waitFor) {
        Karma.compute(state.trustList, waitFor(function (err, result) {
            if (err) {
                console.log(err);
                state.synced = true;
                state.error = err;
                state.syncing = false;
                return;
            } else {
                state.karmas = result;
                if (JSON.stringify(state.trustList) !== trustStr) { throw new Error(); }
            }
        }));
    }).nThen(function (waitFor) {
        state.karmaByAddr = {};
        state.karmas.forEach(function (karma) { state.karmaByAddr[karma.addr] = karma.karma; });
        state.synced = true;
        state.syncing = false;
        var oss = state.onSync;
        state.onSync = [];
        oss.forEach(function (os) { try { os(); } catch (e) { console.log(e.stack); } });
    });
};
var whenSynced = state.whenSynced = function (fun) {
    if (state.synced) {
        fun();
    } else {
        state.onSync.push(fun);
        checkSync();
    }
};
global.state = state;

TrustDB.readFile(DB_FILE, function (err, trusts) {
    // unrecoverable
    if (err) { throw err; }
    trusts.forEach(function (tr) {
        switch (tr.command) {
            case 'itrust': state.trustList.push(tr); break;
            case 'referendum': state.referendums.push(tr); break;
        }
    });
    checkSync();

    var bot = new irc.Client(network.domain, network.nick, config);

    setInterval(function () {
        if ((new Date().getTime()) - state.timeOfLastPing > LAG_MAX_BEFORE_DISCONNECT) {
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
                            console.error(err);
                        }
                    }
                });
            });
        });

    module.exports = en;

});
