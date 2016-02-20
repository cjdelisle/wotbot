;(function () { 'use strict';
var Humans = require('./Humans');
var ROOT = "fc7f:3d04:419f:e9b0:526f:fc6a:576:cba0";
var TRAIN_UNTIL = 1453844364189;
var RESERVE_K = 0.3;

var dedupe = function (trusts) {
    var trustPairs = { };
    var result = [];
    for (var i = trusts.length-1; i >= 0; i--) {
        var pair = trusts[i].dest + '|' + trusts[i].src;
        if (pair in trustPairs) { continue; }
        trustPairs[pair] = 1;
        if (trusts[i].trust === 0) { continue; }
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
        if (!nodes[current]) { continue; }
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

var karmasToList = function (map) {
    var list = [];
    for (var addr in map) { list.push(map[addr]); }
    list.sort(function (a,b) {
        if (b.karma !== a.karma) { return b.karma - a.karma; }
        return a.addr < b.addr ? 1 : -1;
    });
    return list;
};

var getZeroKarmas = function (trusts) {
    var names = getNamesForIps(trusts);

    var addresses = {};
    for (var i = 0; i < trusts.length; i++) {
        addresses[trusts[i].src] = 1;
        addresses[trusts[i].dest] = 1;
    }

    var out = {};
    for (var addr in addresses) { out[addr] = { karma: 0, addr: addr, names: names[addr] }; }
    return out;
};

var run = function (trusts) {
    var zkarmas = getZeroKarmas(trusts);
    var nodes = {};
    var trustPairs = {};
    for (var i = trusts.length-1; i >= 0; i--) {
        if (trusts[i].time > TRAIN_UNTIL) { continue; }
        var srcAddr = trusts[i].src;
        var pair = trusts[i].dest + '|' + srcAddr;
        if (pair in trustPairs) { continue; }
        trustPairs[pair] = 1;
        if (trusts[i].trust === 0) { continue; }
        var n = nodes[srcAddr] = nodes[srcAddr] || {};
        var l = n.links = n.links || [];
        l.push({ target: trusts[i].dest, weight: trusts[i].trust / 100 });
    }
    var res = maxMetric(nodes, ROOT);
    for (var addr in res) { zkarmas[addr].karma = res[addr] * 100; }
    return zkarmas;
};

// Pure Fractional reserve.
var runRootless0 = function (state0, trusts) {
    var state = JSON.parse(JSON.stringify(state0));
    trusts = dedupe(trusts);

    for (let addr in state) {
        let n = state[addr];
        n.totalOutgoingTrust = 0;
        n.availableKarma = n.karma;
        n.karma = 0;
        n.nextAvailableKarma = 0;
    }
    let highestTotalTrust = 0;
    trusts.forEach(function (t) {
        let n = state[t.src];
        n.totalOutgoingTrust += t.trust;
        if (n.totalOutgoingTrust > highestTotalTrust) { highestTotalTrust = n.totalOutgoingTrust; }
    });

    var cycles = 0;
    var cycle = function () {
        cycles++;
        trusts.forEach(function (t) {
            var src = state[t.src];
            var dst = state[t.dest];
            //if (!dst) { return; }
            var tfrac = t.trust / highestTotalTrust;
            if (tfrac > 1) { throw new Error(); }
            dst.nextAvailableKarma +=
                (src.availableKarma - (src.availableKarma * RESERVE_K)) * tfrac;
        });
        let totalDiff = 0;
        let totalKarma = 0;
        for (let addr in state) {
            let n = state[addr];
            totalDiff += n.nextAvailableKarma;
            n.karma += n.availableKarma;
            totalKarma += n.karma;
            n.availableKarma = n.nextAvailableKarma;
            n.nextAvailableKarma = 0;
        }
        console.log(totalKarma + '  ' + totalDiff + '  ' + cycles);
        return totalDiff * (1000 / totalKarma);
    };
    while (cycle() > 0.01) {}
    for (let addr in state) {
        let n = state[addr];
        n.karma += n.availableKarma;
        delete n.availableKarma;
        delete n.nextAvailableKarma;
        delete n.totalOutgoingTrust;
    }
    console.log(cycles + ' cycles');
    return state;
};

var runRootless1 = function (state0, trusts) {
    var state = JSON.parse(JSON.stringify(state0));
    trusts = dedupe(trusts);

    for (let addr in state) {
        let n = state[addr];
        n.totalOutgoingTrust = 0;
        n.nextKarma = n.karma;
    }
    let highestTotalTrust = 0;
    trusts.forEach(function (t) {
        let n = state[t.src];
        n.totalOutgoingTrust += t.trust;
        if (n.totalOutgoingTrust > highestTotalTrust) { highestTotalTrust = n.totalOutgoingTrust; }
    });

    var cycles = 0;
    var cycle = function () {
        cycles++;
        trusts.forEach(function (t) {
            var src = state[t.src];
            var dst = state[t.dest];
            var tfrac = t.trust / highestTotalTrust;
            if (tfrac > 1) { throw new Error(); }
            dst.nextKarma += src.karma * tfrac;
        });
        let totalDiff = 0;
        let totalKarma = 0;
        for (let addr in state) { totalKarma += state[addr].nextKarma; }
        let multiplier = 1000/totalKarma;
        for (let addr in state) {
            let n = state[addr];
            let nc = n.nextKarma * multiplier;
            totalDiff += Math.abs(nc - n.karma);
            n.nextKarma = n.karma = nc;
        }
        console.log(totalKarma + '  ' + totalDiff + '  ' + cycles);
        return totalDiff;
    };
    while (cycle() > 1) {}
    for (let addr in state) {
        let n = state[addr];
        delete n.nextKarma;
        delete n.totalOutgoingTrust;
    }
    console.log(cycles + ' cycles');
    console.log('highestTotalTrust ' + highestTotalTrust);
    return state;
};

var runRootless = function (state0, trusts) {
    state0 = JSON.parse(JSON.stringify(state0));
    trusts = dedupe(trusts);
    var cycles = 0;
    var cycle = function () {
        cycles++;
        var karmaByAddr = {};
        var addr;
        for (addr in state0) { karmaByAddr[addr] = state0[addr].karma; }
        var totalTrustByAddr = {};
        var highestTotal = 0;
        trusts.forEach(function (t) {
            var total = totalTrustByAddr[t.src] = (totalTrustByAddr[t.src]||0) + t.trust;
            if (total > highestTotal) { highestTotal = total; }
            karmaByAddr[t.dst] = karmaByAddr[t.dst]||0;
        });
        var nextKarmaByAddr = {};
        trusts.forEach(function (t) {
            var ks = karmaByAddr[t.src]||0;
            var kd = karmaByAddr[t.dest]||0;
            var tfrac = t.trust / highestTotal;
            if (tfrac > 1) { throw new Error(); }
            nextKarmaByAddr[t.dest] = (nextKarmaByAddr[t.dest] || kd) +
                ((ks - (ks * RESERVE_K)) * tfrac);
        });
        var totalKarma = 0;
        var totalDiff = 0;
        for (addr in nextKarmaByAddr) { totalKarma += nextKarmaByAddr[addr]; }
        var multiplier = 1000/totalKarma;
        for (addr in nextKarmaByAddr) {
            var nk = nextKarmaByAddr[addr] * multiplier;
            totalDiff += Math.abs(state0[addr].karma - nk);
            state0[addr].karma = nk;
        }
        console.log(totalKarma + '  ' + totalDiff + '  ' + cycles);
        return totalDiff;
    };
    while (cycle() > 1) {}
    console.log(cycles + ' cycles');
    return state0;
};

var computeRootless = function (parsed, cb) {
    let trusts = parsed.filter(function (x) { return x.command === 'itrust'; });
    let karmas = getZeroKarmas(trusts);
    for (let x in karmas) { if (Humans.indexOf(karmas[x].addr) !== -1) { karmas[x].karma = 1; } }
    cb(undefined, karmasToList(runRootless1(karmas, parsed)));
}

var computeRooted = function (parsed, cb) {
    parsed = parsed.filter(function (x) { return x.command === 'itrust'; });
    var out = run(parsed);
    cb(undefined, karmasToList(runRootless(out, parsed)));
};

var compute = module.exports.compute = computeRooted;

if (module.parent === null) {
    var input = '';
    process.stdin.on('data', function (d) { input += d; });
    process.stdin.on('end', function () {
        compute(require('./trustdb').parse(input), function (err, ret) {
            if (err) { throw err; }
            ret.forEach(function (x) {
                var pNames = x.names.join();
                pNames += (new Array(Math.max(30 - pNames.length, 5))).join(' ');
                console.log(Math.floor(x.karma * 1000) / 1000 + '\t\t' + pNames + x.addr);
            });
        });
    });
}

}());
