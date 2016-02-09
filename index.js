var irc = require("irc"),
    mis = require("mis"),
    lib = require("./lib/index"),
    Fs = require("fs"),
    agml = require("agml"),
    Karma = require('./karma.js'),
    TrustDB = require('./trustdb.js');

var DB_FILE = './test/trust.db';

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
    trustBySrcDestPair: {},
    karmas: null,
    karmaByAddr: null,
    logStream: Fs.createWriteStream(DB_FILE, {flags: 'a'})
};
var updateTrusts = state.updateTrusts = function (src, srcNick, dst, dstNick, amt, cb) {
    var run = function () {
        if (state.syncing) {
            setTimeout(run, 1);
            return;
        }
        var line = {
            command: 'itrust',
            src: src,
            srcNick: srcNick,
            dest: dst,
            destNick: dstNick,
            trust: parseInt(amt),
            time: new Date().getTime()
        };
        state.trustBySrcDestPair[src + '|' + dst] = line;
        state.logStream.write(JSON.stringify(line)+"\n");
        synced = false;
        cb();
    };
    run();
};
var checkSync = function () {
    if (state.synced || state.syncing) { return; }
    state.syncing = true;
    var trusts = [];
    for (var sdp in state.trustBySrcDestPair) { trusts.push(state.trustBySrcDestPair[sdp]); }
    Karma.compute(trusts, function (err, result) {
        if (err) {
            console.log(err);
            state.synced = true;
            state.error = err;
            state.syncing = false;
            return;
        }
        state.karmas = result;
        state.karmaByAddr = {};
        result.forEach(function (karma) { state.karmaByAddr[karma.addr] = karma.karma; });
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
    trusts.forEach(function (tr) { state.trustBySrcDestPair[tr.src + '|' + tr.dest] = tr; });
    checkSync();

    var bot = new irc.Client(network.domain, network.nick, config);

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
