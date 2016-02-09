console.log("Got a message!");
console.log(args);

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

var from = args.from,
    to = args.to,
    msg = args.message,
    host = msg.host,
    content = msg.args[1];

// .getAllTrusted(fromNick)
// .getTrust(fromNick, toNick)
// .getValue(nick)
// .kick(nick);

(function () {
//    if (!config.trustee) { return; }

    if (!/^\s*\.(itrust|trust|karma|kick|startlogging|stoplogging)/.test(content)) { return; }

    var tokens = content.trim().slice(1).split(/\s+/);
    var line = {
        args: tokens,
        from: host,
        channel: to,
        time: new Date().getTime(),
    };
    console.log("Got a message");

    switch (tokens[0]) {
        case 'itrust': (function () {
            validItrust(tokens, function (e, out) {
                if (e) {
                    // there was an error. complain and return
                    bot.say(to, e);
                } else {
                    // no errors, write to log
                    global.state.updateTrusts(
                        line.from, from, out, tokens[1], parseInt(tokens[2]),
                        function () {
                            var debug = (from + " trusts " +
                                out + " " + tokens[2] + "%");
                            bot.say(to, debug);
                            console.log(debug);
                        });
                }
            });
        }());break;

        case 'trust': (function () {
            if (tokens.length > 3 || tokens.length < 2) {
                bot.say(to, "try .trust <src> <dest>  or  .trust <dest>");
                return;
            }
            var destNick = tokens.pop();
            var srcNick = (tokens.length === 2) ? tokens.pop() : from;
            var fin = function (src, dest) {
                var trust = global.state.trustBySrcDestPair[src + '|' + dest] || { trust: 0};
                bot.say(to, srcNick + " trusts " + destNick + " " + trust.trust + "%");
            };
            nick2Host(destNick, function (err, dest) {
                if (err) { bot.say(to, err); return; }
                if (srcNick !== from) {
                    nick2Host(srcNick, function (err, src) {
                        if (err) { bot.say(to, err); return; }
                        fin(src, dest);
                    });
                } else {
                    fin(line.from, dest);
                }
            });
        }());break;

        case 'karma': (function () {
            if (tokens.length !== 2) {
                bot.say(to, 'try .karma <nick>');
                return;
            }
            nick2Host(tokens[1], function (err, addr) {
                if (err) { bot.say(to, err); return; }
                global.state.whenSynced(function () {
                    var karma = global.state.karmaByAddr[addr] || 0;
                    bot.say(to, addr + ' has ' + karma + ' karma');
                });
            });
        }());break;

        case 'error': (function () {
            var error = global.state.error || "none";
            global.state.error = undefined;
            bot.say(to, error);
        }());break;

        // For laughs...
        case 'startlogging':
            bot.say(to, "Logging enabled");
            break;
        case 'stoplogging':
            bot.say(to, "You're not the boss of me!");
            break;

        default:
            break;
    }
}());

function validPercent (token) {
    var num = Number(token);
    return (typeof (num) === 'number' &&
        num % 1 === 0 &&
        num > -1 &&
        num < 101);
};

function nick2Host (nick, cb) {
    // cb(/*ERROR*/, /*result*/);
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

function validItrust (tokens, cb) {
    // itrust nick/host percent

    // there should be three tokens
    if (tokens.length !== 3) {
        // complain and return
        cb("try `.itrust nick <int 0-100>`", null);
        return;
    } else if (!validPercent(tokens[2])) {
        // complain and return
        cb("your value should be an integer between 0 (no trust) and 100 (complete trust)", null);
        return;
    } else {
        // try to get the host
        nick2Host(tokens[1], cb);
    }
};
