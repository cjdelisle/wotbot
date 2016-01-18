console.log("Somebody got mode +o");
console.log(args);

/*

>+mode
Somebody got mode +o
{ channel: '#fuck-off-ansuz-you-sjw-tool',
  by: 'fcbe0a4b',
  mode: 'o',
  argument: 'cjd',
  message: 
   { prefix: 'fcbe0a4b!~NSA@fcbe:5f12:67d8:77ea:e4d8:aecc:2b4f:a4b',
     nick: 'fcbe0a4b',
     user: '~NSA',
     host: 'fcbe:5f12:67d8:77ea:e4d8:aecc:2b4f:a4b',
     command: 'MODE',
     rawCommand: 'MODE',
     commandType: 'normal',
     args: [ '#fuck-off-ansuz-you-sjw-tool', '+o', 'cjd' ] } }
18 Jan 18:28:38 - MODE: #paris sets mode: +o

*/

if (args.mode === 'o') {
    var Sem = global.semapores = global.semaphores || {};

    var id = 'op::'+args.channel+'->'+args.argument;

    if (Sem[id]) {
        // avoiding a double op
        clearTimeout(Sem[id]);
        console.log("%s was already opped in %s",args.argument, args.channel);
    }
}
