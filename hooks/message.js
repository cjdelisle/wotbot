/* globals args, bot, state, network */

/*
>message
Got a message!
{ from: 'ansuz',
  to: '#bots',
  message:
   { prefix: 'ansuz!~ansuz@fc6a:30c9:53a1:2c6b:ccbf:1261:2aef:45d3',
     nick: 'ansuz',
     user: '~ansuz',
     host: 'fc6a:30c9:53a1:2c6b:ccbf:1261:2aef:45d3',
     command: 'PRIVMSG',
     rawCommand: 'PRIVMSG',
     commandType: 'normal',
     args: [ '#bots', 'hi NSA' ] } }
*/

var Time = require('./Time');

var from = args.from,
    to = args.to,
    msg = args.message,
    host = msg.host,
    content = msg.args[1];

// .getAllTrusted(fromNick)
// .getTrust(fromNick, toNick)
// .getValue(nick)
// .kick(nick);

var validPercent = function (token) {
    if (Number(token).toString() !== token || token === "NaN") { return false; }
    var num = Number(token);
    return (typeof (num) === 'number' &&
        num % 1 === 0 &&
        num > -1 &&
        num < 101);
};

var nick2Host = function (nick, cb) {
    // cb(/*ERROR*/, /*result*/);
    if (nick.indexOf(':') !== -1) {
        if (typeof(state.karmaByAddr[nick]) !== 'undefined') {
            cb(null, nick);
            return;
        }
    }
    bot.whois(nick, function (message) {
        if (message && message.host) {
            cb(null, message.host);
            console.log(message);
        } else {
            cb("could not find a host for ["+nick+"]", null);
            console.log("DEBUG");
            console.log(message);
        }
    });
};

(function () {
    if (content.indexOf(network.trigger) !== 0) { return; }

    var tokens = content.trim().slice(1).split(/\s+/);
    if (to === bot.nick) { to = from; }
    var line = {
        args: tokens,
        from: host,
        channel: to,
        time: new Date().getTime(),
    };

    switch (tokens[0]) {
        case 'itrust': (function () {
            if (tokens.length < 2 || tokens.length > 3) {
                bot.say(to, from + ": try `.itrust nick <int 0-100>` or `.itrust nick` to check");
                return;
            }
            if (from === tokens[1]) {
                bot.say(to, from + ": yeah yeah everybody trusts themselves, old news");
                return;
            }
            nick2Host(tokens[1], function (e, out) {
                if (e) {
                    bot.say(to, from + ": " + e);
                    return;
                }
                if (tokens.length === 3) {
                    if (!validPercent(tokens[2])) {
                        bot.say(to, from + ": your value should be an integer between 0 " +
                            "(no trust) and 100 (complete trust)");
                        return;
                    }
                    // no errors, write to log
                    state.logToDb({
                        command: 'itrust',
                        src: line.from,
                        srcNick: from,
                        dest: out,
                        destNick: tokens[1],
                        trust: parseInt(tokens[2]),
                        time: new Date().getTime()
                    }, function (err) {
                        if (err) {
                            bot.say(to, from + ': ' + err);
                        } else {
                            bot.say(to, (from + " trusts " + out + " " + tokens[2] + "%"));
                        }
                    });
                } else {
                    var fTrust = state.trustBySrcDestPair[line.from + '|' + out] || 0;
                    var rTrust = state.trustBySrcDestPair[out + '|' + line.from] || 0;
                    bot.say(to, (from + " trusts " + out + " " + fTrust + "% and is trusted " +
                        rTrust + "%"));
                }
            });

        }());break;

        case 'karma': (function () {
            if (tokens.length !== 2) {
                bot.say(to, from + ': try .karma <nick>');
                return;
            }
            nick2Host(tokens[1], function (err, addr) {
                if (err) { bot.say(to, from + ': ' + err); return; }
                state.whenSynced(function () {
                    var karma = Math.floor((state.karmaByAddr[addr] || 0) * 1000) / 1000;
                    bot.say(to, from + ': ' + addr + ' has ' + karma + ' karma');
                });
            });
        }());break;

        case 'error': (function () {
            var error = state.error || "none";
            state.error = undefined;
            bot.say(to, from + ': ' + error);
        }());break;

        case 'referendum': (function () {
            if (tokens.length < 4) {
                bot.say(to, from + ': try .referendum <url of description> <opt1> <opt2> [<optX>]');
                return;
            }
            var num = state.referendums.length;
            var tkns = [];
            tkns.push.apply(tkns, tokens);
            tkns.shift();
            var url = tkns.shift();
            state.logToDb({
                command: 'referendum',
                src: line.from,
                srcNick: from,
                url: url,
                options: tkns,
                num: num,
                time: Time.now()
            }, function (err) {
                if (err) {
                    bot.say(to, from + ': ' + err);
                } else {
                    bot.say(to, (from + " created referendum r" + num + " (" + url + ") options " + JSON.stringify(tkns)));
                }
            });
        }());break;

        case 'vote': (function () {
            if (tokens.length < 3 || !/^r[0-9]+$/.test(tokens[1])) {
                bot.say(to, from + ': try .vote r<number> <choice1> [<choice2> [<choiceX>]]');
                return;
            }
            tokens.shift();
            var refNum = tokens.shift();
            var ref = state.referendums[Number(refNum.substring(1))];
            if (!ref) {
                bot.say(to, from + ': referendum ' + refNum + ' not found');
                return;
            }
            if (ref.time < (Time.now() - Time.WEEK_MS)) {
                bot.say(to, from + ': voting on referendum ' + refNum + ' has closed');
                return;
            }
            for (var i = 0; i < tokens.length; i++) {
                if (ref.options.indexOf(tokens[i]) === -1) {
                    bot.say(to, from + ': ' + tokens[i] + ' is not a valid option');
                    return;
                }
            }
            state.logToDb({
                command: 'vote',
                src: line.from,
                srcNick: from,
                choices: tokens,
                num: refNum,
                time: Time.now()
            }, function (err) {
                if (err) {
                    bot.say(to, from + ': ' + err);
                } else {
                    bot.say(to, from + ': vote registered');
                }
            });
        }());break;

        case 'tally': (function () {
            if (tokens.length !== 2 || !/^r[0-9]+$/.test(tokens[1])) {
                bot.say(to, from + ': try .tally r<number>');
                return;
            }
            tokens.shift();
            var refNum = Number((''+tokens.shift()).substring(1));
            var ref = state.referendums[refNum];
            if (!ref) {
                bot.say(to, from + ': referendum ' + refNum + ' not found');
                return;
            }
            state.tallyReferendum(refNum, function (ret) {
                var closeTime = ret.timeRemaining > 0 ?
                    ('closing in: ' + Time.formatTimespan(ret.timeRemaining)) :
                    ('voting closed');
                var winner = JSON.stringify(ret.tally.ranking[0]);
                var rank = ret.tally.ranking.map(JSON.stringify).join(', ');
                bot.say(to, from + ': ' + ref.url + ' ' + winner + ' winning, rank: ' + rank +
                    ', ' + closeTime + ' (' + ret.tally.explanation.join(', ') + ')');
            });
        }());break;

        default:
            break;
    }
}());
