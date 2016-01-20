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
    if (!config.trustee) { return; }

    var commands = /^\s*\.(itrust|getAllTrusted|getTrust|getValue|kick)/;

    if (commands.test(content)) {
        var tokens = content.trim().slice(1).split(/\s+/);
        var line = {
            args: tokens,
            from: host,
            channel: to,
            time: new Date().getTime(),
        };
        console.log("Got a message");
        console.log(typeof global.logStream.write);

        if (global.logStream && global.logStream.write) {
            switch (tokens[0]) {
                case 'itrust':
                    validItrust(tokens, function (e, out) {
                        if (e) {
                            // there was an error. complain and return
                            bot.say(to, e);
                        } else {
                            // no errors, write to log
                            line.args = [tokens[0], out, tokens[2]];
                            global.logStream.write(JSON.stringify(line)+"\n");
                            bot.say(from + " trusts " +
                                out + " " + tokens[2] + "%");
                        }
                    });
                    break;
                case 'getAllTrusted':
                    bot.say(to, "todo");
                    break;
                case 'getTrust':
                    bot.say(to, "todo");
                    break;
                case 'getValue':
                    bot.say(to, "todo");
                    break;
                case 'kick':
                    bot.say(to, "todo");
                    break;
                default:
                    break;
            }
        } else {
            bot.say("Couldn't write to log");
        }
    } else {
        // do nothing...
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
        if (!message.host) {
            cb("could not find a host for that nick", null);
            console.log("DEBUG");
            console.log(message);
        } else {
            cb(null, message.host);
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
