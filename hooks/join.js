console.log("Joined!");

console.log(args);

var channel = args.channel,
    nick = args.nick,
    msg = args.message;

// what hosts do I trust?
var ips = [
    'fc6a:30c9:53a1:2c6b:ccbf:1261:2aef:45d3', // union

    'fc34:8675:ed95:600c:38d7:6eb8:f5b9:5bfa', // queen
    'fcbf:8145:9f55:202:908f:bcce:c01e:caf2', // dundas
    'fc27:520a:25a3:60c4:be42:3d86:aab5:4307', // bloor

    'fc92:8136:dc1f:e6e0:4ef6:a6dd:7187:b85f', // cjd?
    'fc67:9816:2ccc:c4c2:f76c:1d09:a7a5:44e', // larsg
    'fca2:ef7:4f84:3999:6db0:1a0f:c80d:3912', // emery
    'fce4:ebad:b910:f379:dc52:2fa5:1538:c860', // whyruslee
    'fcc3:def:490f:149b:5b07:9952:d47c:6ec1', // dvn
    'fc9e:ab5a:c263:35c9:8156:8b4b:4850:c6da', // woshilapi
    'fc05:7988:6e81:6986:9410:8e06:b2b8:8bd3', // ralph
];

if (ips.indexOf(msg.host) !== -1) {
    bot.send('mode', channel, '+o', nick);
}
