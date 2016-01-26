var Spawn = require('child_process').spawn;

var SOURCE = "fc7f:3d04:419f:e9b0:526f:fc6a:576:cba0";

//var debug = function (str) { console.log(str); };
var debug = function () { };

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

var rememberName = function (names, line, attr) {
    // see that there's an array to push to
    names[line[attr]] = names[line[attr]] || [];

    if (names[line[attr]].indexOf(line[attr+'Nick']) === -1) {
        names[line[attr]].push(line[attr+'Nick']);
    }
};

var run = function (trusts, sourceNode) {
    var trustPairs = { };
    var trustsBySource = { };
    var names = {};

    trusts.forEach(function (tr) {
        rememberName(names, tr, 'src');
        rememberName(names, tr, 'dest');
    });

    // effective resistance from source
    var ers = { };
    for (var i = trusts.length-1; i >= 0; i--) {
        // formerly args[1]
        var target = trusts[i].dest
        // formerly .from
        var source = trusts[i].src
        // formerly args[2]
        // var amtS = trusts[i].trust;
        //var amt = Number(amtS);
        var amt = trusts[i].trust;

        if (target === source) { continue; }
        var pair = target + '|' + source;
        if (pair in trustPairs) { continue; }
        trustPairs[pair] = 1;
        (trustsBySource[source] = trustsBySource[source] || {})[target] = amt;
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
                    // TypeError: Cannot use 'in' operator to search for 'fc67:9816:2ccc:c4c2:f76c:1d09:a7a5:44e' in undefined
                    if (!( trustsBySource[nodes[j]] &&
                            trustsBySource[nodes[j]][targetAddr] )) {
                        debug("trustsBySource[nodes[j]][targetAddr] is undefined");
                        continue;
                    }

                    // if you're here, then it exists...
                    nodesTrusting.push({
                        addr: nodes[j],
                        ers: ers[nodes[j]],
                        trust: trustsBySource[nodes[j]][targetAddr]
                    });
                }
                ers[targetAddr] = getERS(nodesTrusting);
                next.push(targetAddr);
            }
        }
        if (next.length) { process(next); }
    };
    process([sourceNode]);

    debug('\n\n\n');

    var allTrusts = Object.keys(ers).map(function (addr) {
        // effective resistance
        return {
            karma: trustFromResistance(ers[addr]),
            addr: addr,
            names: names[addr]
        };
    });

    allTrusts.sort(function (a,b) {
        return b.karma - a.karma;
    });

    /*allTrusts.forEach(function (node) {
        console.error("["+names[node.addr].join(",")+"]");
        console.error("\t%s\t%s", node.addr,node.karma);
    });*/
    console.log(JSON.stringify(allTrusts, null, '  '));
};

if (module.parent === null) {
    var input = '';
    process.stdin.on('data', function (d) { input += d; });
    process.stdin.on('end', function () {
        run(JSON.parse(input), SOURCE);
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
