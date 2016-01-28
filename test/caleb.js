var Spawn = require('child_process').spawn;

var SOURCE = "fc7f:3d04:419f:e9b0:526f:fc6a:576:cba0";

var debug = function (str) { console.log(str); };
debug = function () { };

var resistanceFromTrust = function (trust) {
    if (trust <= 0 || trust > 100) { throw new Error(); }
    return 100 / trust;
};

var trustFromResistance = function (r) {
    if (r < 0) { throw new Error(); }
    return r ? 100 / r : 100;
};

// Get the effective resistance from the source for a given node
// nodesTrusting -> [ { ers: Number, trust: Number } ];
var getERS = function (nodesTrusting) {
    var rDenom = 0;
    for (var i = 0; i < nodesTrusting.length; i++) {
        debug('    rDenom += ' + nodesTrusting[i].ers + ' + resistanceFromTrust(' +
            nodesTrusting[i].trust + ')');
        rDenom += 1 / (nodesTrusting[i].ers + resistanceFromTrust(nodesTrusting[i].trust));
    }
    return 1 / rDenom;
};

var dedupe = function (trusts) {
    var trustPairs = { };
    var result = [];
    for (var i = trusts.length-1; i >= 0; i--) {
        if (trusts[i].dest === trusts[i].src) { continue; }
        var pair = trusts[i].dest + '|' + trusts[i].src;
        if (pair in trustPairs) { continue; }
        trustPairs[pair] = 1;
        result.unshift(trusts[i]);
    }
    return result;
};

var rememberName = function (names, line, attr) {
    // see that there's an array to push to
    names[line[attr]] = names[line[attr]] || [];

    if (names[line[attr]].indexOf(line[attr+'Nick']) === -1) {
        names[line[attr]].push(line[attr+'Nick']);
    }
};

var getNamesForIps = function (trusts) {
    var names = {};
    trusts.forEach(function (tr) {
        rememberName(names, tr, 'src');
        rememberName(names, tr, 'dest');
    });
    return names;
};

var run = function (trusts, sourceNode) {
    var trustsBySource = { };
    var names = getNamesForIps(trusts);
    // effective resistance from source
    var ers = { };
    trusts = dedupe(trusts);

    for (var i = trusts.length-1; i >= 0; i--) {
        var target = trusts[i].dest
        var src = trusts[i].src;
        (trustsBySource[src] = trustsBySource[src] || {})[target] = trusts[i].trust;
        ers[target] = -1;
    }

    ers[sourceNode] = 0;

    var process = function (nodes) {
        var next = [];
        for (var i = 0; i < nodes.length; i++) {
            for (var targetAddr in trustsBySource[nodes[i]]) {
                debug(targetAddr);
                if (ers[targetAddr] !== -1) { continue; }
                debug('  trusted by ' + nodes[i] + ' ' + trustsBySource[nodes[i]][targetAddr]);
                var nodesTrusting = [ ];
                for (var j = i; j < nodes.length; j++) {
                    if (trustsBySource[nodes[j]] && trustsBySource[nodes[j]][targetAddr]) {
                        nodesTrusting.push({
                            addr: nodes[j],
                            ers: ers[nodes[j]],
                            trust: trustsBySource[nodes[j]][targetAddr]
                        });
                    }
                }
                ers[targetAddr] = getERS(nodesTrusting);
                next.push(targetAddr);
            }
        }
        if (next.length) { process(next); }
    };
    process([sourceNode]);

    debug('\n\n\n');

    return Object.keys(ers).map(function (addr) {
        // effective resistance
        return {
            karma: trustFromResistance(ers[addr]),
            addr: addr,
            names: names[addr]
        };
    }).sort(function (a,b) {
        return b.karma - a.karma;
    });
};

if (module.parent === null) {
    var input = '';
    process.stdin.on('data', function (d) { input += d; });
    process.stdin.on('end', function () {
        if (process.argv.indexOf('test') !== -1) {
            input = '[' + input.replace(/\n/g, ',\n').slice(0, -2) + ']';
            run(JSON.parse(input), SOURCE).forEach(function (x) {
                console.log(Math.floor(x.karma * 1000) / 1000 + '\t\t' + x.names.join() + '\t\t\t(' +
                    x.addr + ')');
            });
            return;
        }
        console.log(JSON.stringify(run(JSON.parse(input), SOURCE), null, '  '));
    });
} else {
    module.exports.run = function (trusts, cb) {
        var proc = Spawn('node', [__filename]);
        var err = '';
        var out = '';
        proc.stderr.on('data', function (data) { err += data.toString('utf8'); });
        proc.stdout.on('data', function (data) { out += data.toString('utf8'); });
        proc.on('close', function () {
            var parsed;
            try {
                parsed = JSON.parse(out);
            } catch (e) { cb(e, err); return; }
            cb(undefined, err, parsed);
        });
        proc.stdin.end(JSON.stringify(trusts));
    };
}
