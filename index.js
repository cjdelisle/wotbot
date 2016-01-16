var irc = require("irc"),
    mis = require("mis"),
    lib = require("./lib/index"),
    fs = require("fs"),
    levelup = require("levelup");

var config = {
    debug: true,
    channels: [
        '#bots',
        '#cjdns',
        '#documentation',
        '#cs',
        '#peering',
        '#fc00',
        '#netops',
        '#webdev',
        '#fuck-off-ansuz-you-sjw-tool',
        '#paris',
    ],
    floodProtection: true,
    floodProtectionDelay: 1000,

    userName: 'NSA',

    autoRejoin: false,
    autoConnect: true,
};

var bot = new irc.Client(
    'irc.fc00.io',
    'NSA',
    config);

var en = mis();

en('unhandledException', function (e) {
    console.error(e);
});

lib.wrapHooks(bot, en);

console.log(Object.keys(en().stacks));

Object.keys(en().stacks)
    .forEach(function (k) {
        en(k, function (args) {
            console.log('\n>' + k);
        });

        en(k, function (args) {
            fs.readFile('./hooks/' + k +'.js', 'utf-8', function (e, out) {
                if (e) {
                    console.error(e);
                } else {
                    try {
                        eval(out);
                    } catch (err) {
                        console.error(err);
                    }
                }
            });
        });
    });

module.exports = en;
