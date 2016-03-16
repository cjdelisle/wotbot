/* globals args, bot, state */
console.log("Joined!");
console.log(args);

// What can possibly go wrong ?
bot.send('MODE', args.channel, '+o', args.nick);
