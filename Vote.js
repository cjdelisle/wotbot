(function () { 'use strict';

let buildPairWiseMatrix = function (options, votes) {
    let out = new Array(options.length);
    let optionMap = {};
    for (let i = 0; i < options.length; i++) {
        out[i] = new Array(options.length).fill(0);
        optionMap[options[i]] = i;
    }
    for (let i = 0; i < votes.length; i++) {
        let ballot = votes[i];
        let weight = ballot[0];
        let betterOptions = [];
        for (let j = 1; j < ballot.length; j++) {
            let betterOpt = optionMap[ballot[j]];
            betterOptions[betterOpt] = 1;
            for (let k = 0; k < options.length; k++) {
                let worseOpt = optionMap[options[k]];
                if (betterOptions[worseOpt]) { continue; }
                out[betterOpt][worseOpt] += weight;
            }
        }
    }
    return out;
};

let wordifyDM = function (options, matrix) {
    let out = {};
    for (let i = 0; i < matrix.length; i++) {
        let outRow = out[options[i]] = {};
        let row = matrix[i];
        for (let j = 0; j < matrix.length; j++) {
            outRow[options[j]] = row[j];
        }
    }
    return out;
};

let explainResults = function (options, p) {
    let out = [];
    let numCandidates = options.length;
    for (let i = 0; i < numCandidates; i++) {
        let narrowestLossMargin = Infinity;
        let narrowestLossAgainst = -1;
        for (let j = 0; j < numCandidates; j++) {
            if(p[j][i] <= p[i][j]) { continue; }
            if ((p[j][i] - p[i][j]) < narrowestLossMargin) {
                narrowestLossAgainst = j;
                narrowestLossMargin = (p[j][i] - p[i][j]);
            }
        }
        if (narrowestLossMargin === Infinity) {
            out.push(JSON.stringify(options[i]) + ' is the winner');
        } else if (narrowestLossMargin === 0) {
            out.push(JSON.stringify(options[i]) + ' is tied with ' +
                JSON.stringify(options[narrowestLossAgainst]));
        } else {
            out.push(JSON.stringify(options[i]) + ' is behind ' +
                JSON.stringify(options[narrowestLossAgainst]) + ' by ' +
                Math.floor(narrowestLossMargin * 1000) / 1000);
        }
    }
    return out;
};

let schulzeTally = module.exports.schulzeTally = function (options, votes) {
    let numCandidates = options.length;
    let d = buildPairWiseMatrix(options, votes);
    let p = [];

    for (let i = 0; i < numCandidates; i++) {
        p[i] = p[i] || new Array(numCandidates);
        for (let j = 0; j < numCandidates; j++) {
            p[i][j] = (d[i][j] > d[j][i]) ? d[i][j] : 0;
        }
    }
    for (let i = 0; i < numCandidates; i++) {
        for (let j = 0; j < numCandidates; j++) {
            if (i === j) { continue; }
            for (let k = 0; k < numCandidates; k++) {
                if (i === k || j === k) { continue; }
                p[j][k] = Math.max(p[j][k], Math.min(p[j][i], p[i][k]));
            }
        }
    }

    let winners = new Array(numCandidates).fill(0);
    for (let i = 0; i < numCandidates; i++) {
        for (let j = 0; j < numCandidates; j++){
            if(p[j][i] < p[i][j]) { winners[i]++; }
	    }
    }

    let ranking = [];
    ranking.push.apply(ranking, options);
    ranking.sort(function (x, y) {
        return winners[options.indexOf(y)] - winners[options.indexOf(x)];
    });

    return {
        ranking: ranking,
        strongestPaths: wordifyDM(options, p),
        preferencePairs: wordifyDM(options, d),
        explanation: explainResults(options, p),
    };
};

/*


let x = function (num, str) { let out = [num]; out.push.apply(out, str.split('')); return out; };
let VOTES = {
    options: ['a','b','c','d','e'],
    votes: [
        x(5, 'acbed'),
        x(5, 'adecb'),
        x(8, 'bedac'),
        x(3, 'cabed'),
        x(7, 'caebd'),
        x(2, 'cbade'),
        x(7, 'dceba'),
        x(8, 'ebadc')
    ]
}

console.log(schultzTally(VOTES.options, VOTES.votes));
*/
}());
