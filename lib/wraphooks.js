module.exports = function (bot, en) {
    var schema={
        error:"message",
        names:"channel nick",
        join:"channel nick message",
        part:"channel nick reason message",
        quit:"nick reason channel message",
        kick:"channel nick by message",
        nick:"oldnick newnick channels message",
        topic:"channel topic nick message",
        pm:"from text message",
        "-mode":"channel by mode argument message",
        "+mode":"channel by mode argument message",
        action:"from to text message",
        message:"from to message message",
    };

    Object.keys(schema)
        .forEach(function(key){
            schema[key]=schema[key].split(" ");

            en().place(key);

            bot.addListener(key,function(){
                var args=Array.prototype.slice.call(arguments);
                var res={};
                args.forEach(function(arg,i){
                    res[schema[key][i]]=args[i]||"UNDEFINED";
                })
                en(key)(res);
            });
        });
};
