var Http = require('http');
var Fs = require('fs');
var agml = require('agml');
var Compute = require('./test/caleb.js');
var TrustDB = require('./trustdb.js');

var DEFAULT_PORT = 8080;
var DB_FILE = './test/trust.db';

var handleRequest = function (request, response) {
    TrustDB.readFile(DB_FILE, function (err, trusts) {
        if (err) {
            response.end(JSON.stringify({error: err}, null, '  '));
            return;
        }

        if (request.url === '/trust/karmas') {
            Compute.run(trusts, function (err, stderr, out) {
                if (err) {
                    response.end(JSON.stringify({error: err, stderr: stderr}, null, '  '));
                    return;
                }
                response.end(JSON.stringify(out, null, '  '));
            });
            return;
        }

        if (request.url.indexOf('/trust/trustHistory') === 0) {
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
            return;
        }

        if (request.url === '/trust/trusts') {
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
            return;
        }

        response.end(JSON.stringify({
                available_commands: {
                '/trustHistory?since=<millisecondsSinceEpoch>':
                    'every .itrust which was ever sent (since time if specified)',
                '/trusts': 'all most recent trust updates, enough to compute the graph',
                '/karmas': 'mappings of value (according to computation) for each person'
            }
        }, null, '  '));
    });
};

var main = function () {
    var config = [];
    agml.parse(Fs.readFileSync('./config.agml', 'utf-8'), config);
    var port = DEFAULT_PORT;
    config.forEach(function (elem) {
        if (!('section' in elem) || elem.section === 'httpd') { return; }
        if (!('port' in elem) || Number(elem.port).toString() !== elem.port) { return; }
        port = Number(elem.port);
    });

    Http.createServer(handleRequest).listen(port, function () {
        console.log("listening on port " + port);
    });
};
main();
