* listen
* stop listening
* It should be like
  - "listen" -> "ok"
  - "stop listening" -> "lol yeah right"

// how much do you trust someone?
.itrust <host> <double 1-100>
 
.getAllTrusted <fromNick> // list all of the people who are trusted by this person, if more than 3 then require the command to be PM'd
  
.getTrust <fromNick> <toNick> // get the amount that fromNick trusts toNick
  
.getValue <nick> // Check ip from host, get value on ip <-- this one is hard

.kick <nick> // works if they have a lower .getValue than you do
  
