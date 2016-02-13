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

var ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;
var now = function () { return new Date().getTime(); };

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

    if (!/^\s*\\(itrust|trust|karma|error|referendum|endreferendum)/.test(content)) { return; }

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
            if (from === tokens[1]) {
                bot.say(to, "yeah yeah everybody trusts themselves, old news");
                return;
            }
            validItrust(tokens, function (e, out) {
                if (e) {
                    // there was an error. complain and return
                    bot.say(to, e);
                } else {
                    // no errors, write to log
                    global.state.logToDb({
                        command: 'itrust',
                        src: line.from,
                        srcNick: from,
                        dest: out,
                        destNick: tokens[1],
                        trust: parseInt(tokens[2]),
                        time: new Date().getTime()
                    }, function (err) {
                        if (err) {
                            bot.say(to, err);
                        } else {
                            bot.say(to, (from + " trusts " + out + " " + tokens[2] + "%"));
                        }
                    });
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

        case 'referendum': (function () {
            if (tokens.length < 4) {
                bot.say(to, 'try .referendum <url of description> <opt1> <opt2> [<optX>]');
                return;
            }
            var num = global.state.referendums.length;
            tokens.pop();
            var url = tokens.pop();
            global.state.logToDb({
                command: 'referendum',
                src: line.from,
                srcNick: from,
                url: url,
                options: tokens,
                num: num,
                time: new Date().getTime()
            }, function (err) {
                if (err) {
                    bot.say(to, err);
                } else {
                    bot.say(to, (from + " created referendum r" + num + " (" + tokens[1] + ")"));
                }
            });
        }());break;

        case 'vote': (function () {
            if (tokens.length < 3 || !/^[rR][0-9]+$/.test(tokens[1])) {
                bot.say(to, 'try .vote r<number> <choice1> [<choice2> [<choiceX>]]');
                return;
            }
            var ref = global.state.referendums[Number(tokens[1].substring(1))];
            if (!ref) {
                bot.say(to, 'referendum ' + tokens[1] + ' not found');
                return;
            }
            if (ref.time < (now() - ONE_WEEK_MS)) {
                bot.say(to, 'voting on referendum ' + tokens[1] + ' has closed');
                return;
            }
            tokens.pop();
            var url = tokens.pop();
            global.state.logToDb({
                command: 'referendum',
                src: line.from,
                srcNick: from,
                url: url,
                options: tokens,
                num: num,
                time: now()
            }, function (err) {
                if (err) {
                    bot.say(to, err);
                } else {
                    bot.say(to, "Vote registered");
                }
            });
        }());break;

        default:
            break;
    }
}());

function validPercent (token) {
    if (Number(token).toString() !== token || token === "NaN") { return false; }
    var num = Number(token);
    return (typeof (num) === 'number' &&
        num % 1 === 0 &&
        num > -1 &&
        num < 101);
};

function nick2Host (nick, cb) {
    // cb(/*ERROR*/, /*result*/);
    if (nick.indexOf(':') !== -1) {
        if (typeof(global.state.karmaByAddr[nick]) !== 'undefined') {
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
