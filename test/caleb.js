var fs = require("fs");

var names = {};

var rememberName = function (line, attr) {
    // see that there's an array to push to
    names[line[attr]] = names[line[attr]] || [];

    if (names[line[attr]].indexOf(line[attr+'Nick']) === -1) {
        names[line[attr]].push(line[attr+'Nick']);
    }
};

var TRUSTS = fs.readFileSync('./trust.db', 'utf-8')
    .split("\n")
    .filter(function (line) { return line; })
    .map(function (line) {
        return JSON.parse(line);
    })
    .filter(function (line) {

        rememberName(line, 'src');
        rememberName(line, 'dest');
        return line.trust > 0 && line.trust < 100;
    });

//console.log(names);
//process.exit();

var SOURCE = "fc34:8675:ed95:600c:38d7:6eb8:f5b9:5bfa";
var SOURCE = "fc7f:3d04:419f:e9b0:526f:fc6a:576:cba0";

var debug = function (str) { console.log(str); };

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

var run = function (trusts, sourceNode) {
    var trustPairs = { };
    //var trustsByTarget = { };
    var trustsBySource = { };

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
        // FIXME don't need this
//        if (amtS !== amt.toString() || amt <= 0 || amt > 100) { continue; }

        var pair = target + '|' + source;
        if (pair in trustPairs) { continue; }
        trustPairs[pair] = 1;
        //(trustsByTarget[target] = trustsByTarget[target] || {})[source] = amt;
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
            trust: trustFromResistance(ers[addr]),
            addr: addr,
        };
    });

    allTrusts.sort(function (a,b) {
        return b.trust - a.trust;
    });

    allTrusts.forEach(function (node) {
        console.log("["+names[node.addr].join(",")+"]");
        console.log("\t%s\t%s", node.addr,node.trust);
    });
};
run(TRUSTS, SOURCE);
