var Http = require('http');
var Fs = require('fs');
var agml = require('agml');
var Karma = require('./karma.js');
var TrustDB = require('./trustdb.js');

var DEFAULT_PORT = 8080;
var DEFAULT_DB_FILE = './test/trust.db';

var requests = { };

requests.karma = function (request, response, trusts) {
    Karma.compute(trusts, function (err, out) {
        if (err) {
            response.end(JSON.stringify(err, null, '  '));
            return;
        }
        response.end(JSON.stringify(out, null, '  '));
    });
};

requests.trustHistory = function (request, response, trusts) {
    var since = 0;
    var raw = false;
    request.url.replace(/[\?\&]since=([0-9]+)/, function (all, s) { since = Number(s); });
    if (/[\?\&]raw=true/.test(request.url)) { raw = true; }
    var filteredTrusts = trusts.filter(function (jl) {
        return (('time' in jl) && jl.time >= since);
    });
    var out;
    if (raw) {
        out = filteredTrusts.map(function (t) { return JSON.stringify(t); }).join('\n');
    } else {
        out = JSON.stringify({
            error: 'none',
            since: since,
            trusts: filteredTrusts,
        }, null, '  ');
    }
    response.end(out);
};

var dedupe = function (trusts) {
    var srcDestPairs = {};
    var outTrusts = [];
    for (var i = trusts.length-1; i >= 0; i--) {
        var sdp = trusts[i].src + '|' + trusts[i].dest;
        if (sdp in srcDestPairs) { continue; }
        srcDestPairs[sdp] = 1;
        outTrusts.unshift(trusts[i]);
    }
    return outTrusts;
};

requests.trust = function (request, response, trusts) {
    response.end(JSON.stringify({
        error: 'none',
        trusts: dedupe(trusts)
    }, null, '  '));
};

requests.network = function (request, response, trusts) {
    var sort = 'from';
    var of;
    request.url.replace(/.*\?.*of=([^&]+)/, function (all, o) { of = o; });
    request.url.replace(/.*\?.*sortBy=([^&]+)/, function (all, s) { sort = s; });
    if (!of) {
        response.end(JSON.stringify({ error: "invalid request, expect ?of=<nick|ip>" }));
        return;
    }
    if (sort !== 'from' && sort !== 'to') {
        response.end(JSON.stringify({ error: "invalid request, expect ?sortBy=<from|to>" }));
        return;
    }
    var addr = of;
    trusts = dedupe(trusts);
    trusts.some(function (tr) {
        if (tr.destNick === of || tr.dest === of) {
            addr = tr.dest;
        } else if (tr.srcNick === of || tr.src === of) {
            addr = tr.src;
        }
    });
    var trustByAddr = {};
    dedupe(trusts).forEach(function (tr) {
        if (tr.dest === addr) {
            trustByAddr[tr.src] = trustByAddr[tr.src] ||
                { nick: tr.srcNick, addr: tr.srcAddr, trustTo: 0 };
            trustByAddr[tr.src].trustFrom = tr.trust;
        } else if (tr.src === addr) {
            trustByAddr[tr.dest] = trustByAddr[tr.dest] ||
                { nick: tr.destNick, addr: tr.destAddr, trustFrom: 0 };
            trustByAddr[tr.dest].trustTo = tr.trust;
        }
    });
    trusts = Object.keys(trustByAddr).map(function (addr) { return trustByAddr[addr]; });
    if (sort === 'from') {
        trusts.sort(function (a, b) { return b.trustTo - a.trustTo; });
    } else if (sort === 'to') {
        trusts.sort(function (a, b) { return b.trustTo - a.trustTo; });
    }
    response.end(JSON.stringify({
        error: 'none',
        trusts: trusts
    }, null, '  '));
};

requests.help = function (request, response, trusts) {
    response.end(JSON.stringify({
        available_commands: {
            '/trust/trustHistory?since=<millisecondsSinceEpoch>':
                'every .itrust which was ever sent (since time if specified)',
            '/trust/trust': 'all most recent trust updates, enough to compute the graph',
            '/trust/karma': 'mappings of value (according to computation) for each person',
            '/trust/network?of=<name|ip>[&sortBy=<from|to>]':
                'get ips/names who trust in and are trusted by ip/name, optionally sorted by ' +
                    'most trust given to or received from.'
        }
    }, null, '  '));
};

var main = function () {
    var config = [];
    agml.parse(Fs.readFileSync('./config.agml', 'utf-8'), config);
    var port = DEFAULT_PORT;
    var dbfile = DEFAULT_DB_FILE;
    config.forEach(function (elem) {
        if (!('section' in elem) || elem.section === 'httpd') { return; }
        if (!('port' in elem) || Number(elem.port).toString() !== elem.port) { return; }
        port = Number(elem.port);
        if (!('dbfile' in elem)) { return; }
        dbfile = elem.dbfile;
    });

    Http.createServer(function (request, response) {
        TrustDB.readFile(dbfile, function (err, trusts) {
            if (err) {
                response.end(JSON.stringify({error: err}, null, '  '));
                return;
            }
            var fun = requests[request.url.replace(/^.*\/|\?.*$/g, '')] || requests.help;
            fun(request, response, trusts);
        });
    }).listen(port, '::', function () {
        console.log("listening on port " + port);
    });
};
main();
