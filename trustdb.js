var Fs = require('fs');
var Time = require('./Time');
var Karma = require('./karma');
var nThen = require('nthen');
var Vote = require('./Vote');

var IP_REGEX = /^fc[a-f0-9]{2}:/;

var PARANOIA = true;

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
var validate = function (json) {
    if (!_validate(json)) {
        //console.log('validation of ' + JSON.stringify(json) + ' failed');
        return false;
    }
    return true;
};

var updateState = function (state, structure) {
    if (structure.command === 'referendum') {
        state.referendums.push(structure);
    } else if (structure.command === 'itrust') {
        state.trustList.push(structure);
        state.trustBySrcDestPair[structure.src + '|' + structure.dest] = structure.trust;
    } else if (structure.command === 'vote') {
        if (!/r[0-9]+/.test(structure.num)) { return; }
        var refNum = Number(structure.num.substring(1));
        var ref = state.referendums[refNum];
        if (!ref) { return; }
        for (var i = 0; i < structure.choices.length; i++) {
            if (ref.options.indexOf(structure.choices[i]) === -1) { return; }
        }
        var votes = state.referendumVotes[refNum] = state.referendumVotes[refNum] || [];
        votes.push(structure);
    } else {
        throw new Error();
    }
};

var tallyReferendum = function (state, refNum, cb) {
    var ref = state.referendums[refNum];
    var wotLockTime = ref.time - Time.WEEK_MS;
    var refVotes = state.referendumVotes[refNum] || [];
    var tempTrustList = state.trustList.filter(function (t) { return t.time <= wotLockTime; });
    Karma.compute(tempTrustList, function (err, wot) {
        if (err) { throw err; }
        var wotMap = {};
        wot.forEach(function (w) { wotMap[w.addr] = w; });
        var voteList = refVotes.map(function (v) {
            var arr = [ (wotMap[v.src] || { karma:0 }).karma ];
            arr.push.apply(arr, v.choices);
            return arr;
        });
        var tally = Vote.schulzeTally(ref.options, voteList);
        var timeLeft = ref.time + Time.WEEK_MS - Time.now();
        cb({
            karmas: wot,
            tally: tally,
            wotLockTime: wotLockTime,
            timeRemaining: timeLeft,
            closeTime: ref.time + Time.WEEK_MS,
            creator: ref.src,
            creatorNick: ref.srcNick,
            options: ref.options,
            votes: refVotes
        });
    });
};

var logToDb = function (state, structure, cb) {
    var run = function () {
        if (state.syncing) {
            setTimeout(run, 1);
            return;
        }
        if (!validate(structure)) {
            cb("TrustDB.validate() failed");
            return;
        }
        updateState(state, structure);
        state.logStream.write(JSON.stringify(structure)+"\n");
        state.synced = false;
        cb();
    };
    run();
};

var open;

var checkSync = function (state) {
    if (state.synced || state.syncing) { return; }
    state.syncing = true;
    if (PARANOIA) {
        var trustStr = JSON.stringify(state.trustList);
    }
    var karmas;
    nThen(function (waitFor) {
        if (!PARANOIA) { return; }
        open(state.dbFile, waitFor(function (err, state2) {
            if (err) { throw err; }
            if (trustStr !== JSON.stringify(state2.trustList)) { throw new Error(); }
        }), true);
    }).nThen(function (waitFor) {
        Karma.compute(state.trustList, waitFor(function (err, result) {
            if (err) { throw err; }
            state.karmas = result;
            if (PARANOIA && JSON.stringify(state.trustList) !== trustStr) { throw new Error(); }
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

var whenSynced = function (state, fun) {
    if (state.synced) {
        fun();
    } else {
        state.onSync.push(fun);
        checkSync(state);
    }
};

var parse = function (str) {
    return str.split("\n")
        .filter(function (line) { return line[0] === '{'; })
        .map(function (line) {
            try { return JSON.parse(line); } catch (err) { }
            return null;
        }).filter(validate);
};

var open = module.exports.open = function (dbFile, cb, readOnly) {
    var state = {
        synced: false,
        syncing: false,
        error: null,
        onSync: [],
        trustList: [],
        referendums: [],
        referendumVotes: [],
        trustBySrcDestPair: {},
        karmas: null,
        karmaByAddr: null,
        dbFile: dbFile,
        logStream: (readOnly) ? null : Fs.createWriteStream(dbFile, {flags: 'a'}),
        timeOfLastMsg: (new Date()).getTime(),
        tallyReferendum: (refNum, cb) => (tallyReferendum(state, refNum, cb)),
        whenSynced: (fun) => (whenSynced(state, fun)),
        logToDb: (structure, cb) => (logToDb(state, structure, cb))
    };
    Fs.readFile(dbFile, function (err, ret) {
        if (err) {
            cb(err);
            return;
        }
        var out;
        try {
            out = parse(ret.toString('utf8'));
        } catch (e) { cb(e); return; }
        out.forEach((x) => (updateState(state, x)));
        cb(undefined, state);
    });
};
