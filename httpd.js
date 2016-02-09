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
        }, null, '  ')
    }
    response.end(out);
};

requests.trust = function (request, response, trusts) {
    var srcDestPairs = {};
    var outTrusts = [];
    for (var i = trusts.length-1; i >= 0; i--) {
        var sdp = trusts[i].src + '|' + trusts[i].dest;
        if (sdp in srcDestPairs) { continue; }
        srcDestPairs[sdp] = 1;
        outTrusts.unshift(trusts[i]);
    }
    response.end(JSON.stringify({
        error: 'none',
        trusts: outTrusts
    }, null, '  '));
};

requests.help = function (request, response, trusts) {
    response.end(JSON.stringify({
        available_commands: {
            '/trust/trustHistory?since=<millisecondsSinceEpoch>':
                'every .itrust which was ever sent (since time if specified)',
            '/trust/trust': 'all most recent trust updates, enough to compute the graph',
            '/trust/karma': 'mappings of value (according to computation) for each person'
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
