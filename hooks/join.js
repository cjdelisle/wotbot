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
    'fcbe:5f12:67d8:77ea:e4d8:aecc:2b4f:a4b', // museum

    'fc92:8136:dc1f:e6e0:4ef6:a6dd:7187:b85f', // cjd?
    'fc67:9816:2ccc:c4c2:f76c:1d09:a7a5:44e', // larsg
    'fca2:ef7:4f84:3999:6db0:1a0f:c80d:3912', // emery
    'fce4:ebad:b910:f379:dc52:2fa5:1538:c860', // whyruslee
    'fcc3:def:490f:149b:5b07:9952:d47c:6ec1', // dvn
    'fc9e:ab5a:c263:35c9:8156:8b4b:4850:c6da', // woshilapi
    'fc05:7988:6e81:6986:9410:8e06:b2b8:8bd3', // ralph
    'fcfe:f4ce:609f:434b:aa44:6ea0:ebc2:2d89', // Igel
    'fcd9:c8a0:c35c:ba2e:e3de:b497:8706:2aab', // Arceliar
    'fcd0:dc87:86a:4612:11be:8486:4595:b65', // Aranje

    'fc7c:6025:dce5:af5b:7a3f:8343:b581:c851', // finn's weechat
];

if (ips.indexOf(msg.host) !== -1) {
    // make sure a global semaphore exists...
    var Sem = global.semaphores = global.semaphores || {};

    // op them in between 0 and 10 seconds
    Sem['op::'+channel+'->'+nick] = setTimeout(function () {
        bot.send('mode', channel, '+o', nick);
    }, Math.random() * 15000);
}
