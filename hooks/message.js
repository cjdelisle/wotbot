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

var commands = /\s*\.(getAllTrusted|getTrust|getValue|kick)/;

console.log("pewpew");

if (commands.test(content)) {
    bot.say(to, "I suppose you're talking to me?");
} else {
    // do nothing...

}
