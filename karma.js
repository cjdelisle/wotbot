var Spawn = require('child_process').spawn;

var SOURCE = "fc7f:3d04:419f:e9b0:526f:fc6a:576:cba0";

var debug = function (str) { console.log(str); };
debug = function () { };

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

var maxMetric = function (nodes, root) {
    var res = {};
    res[root] = 1;
    var modified = [];

    modified.push(root);
    do {
        var current = modified.shift();
        if (nodes[current] == null) {
            continue;
        }
        for (var i = 0; i < nodes[current].links.length; i++) {
            var link = nodes[current].links[i];
            var tmp = res[link.target] || 0;
            res[link.target] = Math.max(res[link.target] || 0, (res[current] || 0) * link.weight);
            if (res[link.target] !== tmp) {
                modified.push(link.target);
            }
        }
    } while (modified.length !== 0);
    return res;
};

var run = function (trusts, sourceNode) {
    var names = getNamesForIps(trusts);
    trusts = dedupe(trusts);

    var nodes = {};

    for (var i = trusts.length-1; i >= 0; i--) {
        var srcAddr = trusts[i].src;
        var n = nodes[srcAddr] = nodes[srcAddr] || {};
        var l = n.links = n.links || []
        l.push({ target: trusts[i].dest, weight: trusts[i].trust / 100 });
    }

    var out = [];
    var res = maxMetric(nodes, sourceNode);
    for (var addr in res) { out.push({ karma: res[addr] * 100, addr: addr, names: names[addr] }); }
    out.sort(function (a,b) {
        return b.karma - a.karma;
    });
    return out;
};

if (module.parent === null) {
    var input = '';
    process.stdin.on('data', function (d) { input += d; });
    process.stdin.on('end', function () {
        if (process.argv.indexOf('properjson') === -1) {
            run(require('./trustdb').parse(input), SOURCE).forEach(function (x) {
                console.log(Math.floor(x.karma * 1000) / 1000 + '\t\t' + x.names.join() + '\t\t\t(' +
                    x.addr + ')');
            });
            return;
        }
        console.log(JSON.stringify(run(JSON.parse(input), SOURCE), null, '  '));
    });
} else {
    module.exports.compute = function (trusts, cb) {
        var proc = Spawn('node', [__filename, 'properjson']);
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
