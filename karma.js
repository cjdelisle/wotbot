var Spawn = require('child_process').spawn;

var ROOT = "fc7f:3d04:419f:e9b0:526f:fc6a:576:cba0";

var dedupe = function (trusts) {
    var trustPairs = { };
    var result = [];
    for (var i = trusts.length-1; i >= 0; i--) {
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

var sortKarmas = function (list) {
    list.sort(function (a,b) {
        if (b.karma !== a.karma) { return b.karma - a.karma; }
        return a.addr < b.addr ? 1 : -1;
    });
    return list;
};

var run = function (trusts, root) {
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
    var res = maxMetric(nodes, root);
    for (var addr in res) { out.push({ karma: res[addr] * 100, addr: addr, names: names[addr] }); }
    sortKarmas(out);
    return out;
};

var RESERVE_K = 0.3;
var runRootless = function (state0, trusts) {
    var karmaByAddr = {};
    state0.forEach(function (x) { karmaByAddr[x.addr] = 1||x.karma; });
    var totalTrustByAddr = {};
    trusts.forEach(function (t) {
        totalTrustByAddr[t.src] = (totalTrustByAddr[t.src]|0) + t.trust;
    });
    var nextKarmaByAddr = {};
    trusts.forEach(function (t) {
        var ks = karmaByAddr[t.src]|0;
        var kd = karmaByAddr[t.dest]|0;
        var tfrac = t.trust / totalTrustByAddr[t.src];
        if (tfrac > 1) { throw new Error(); }
        nextKarmaByAddr[t.dest] = (nextKarmaByAddr[t.dest] || kd) + ((ks - (ks * RESERVE_K)) * tfrac);
         //* (t.trust / totalTrustByAddr[t.src]) );
    });
    return sortKarmas(state0.map(function (x) {
        return { karma: nextKarmaByAddr[x.addr], addr: x.addr, names: x.names };
    }));
};

var printRes = function (res) {
    res.forEach(function (x) {
        var pNames = x.names.join();
        pNames += (new Array(Math.max(30 - pNames.length, 5))).join(' ');
        console.log(Math.floor(x.karma * 1000) / 1000 + '\t\t' + pNames + x.addr);
    });
};

if (module.parent === null) {
    var input = '';
    process.stdin.on('data', function (d) { input += d; });
    process.stdin.on('end', function () {
        if (process.argv.indexOf('properjson') === -1) {

            var parsed = require('./trustdb').parse(input);
            //parsed.forEach(function (x) { console.log(x. "") })
            var out = run(parsed, ROOT);
            printRes(out);
            console.log('\n\n');
            printRes(runRootless(out, parsed));
            return;

            run(require('./trustdb').parse(input), ROOT).forEach(function (x) {
                var pNames = x.names.join();
                pNames += (new Array(Math.max(30 - pNames.length, 5))).join(' ');
                console.log(Math.floor(x.karma * 1000) / 1000 + '\t\t' + pNames + x.addr);
            });
            return;
        }
        console.log(JSON.stringify(run(JSON.parse(input), ROOT), null, '  '));
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
