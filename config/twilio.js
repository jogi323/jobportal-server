var accountSid = 'ACe59061ce19c17d5d22f24f4030077216';
var authToken = 'your_auth_token';

//require the Twilio module and create a REST client 
var client = require('twilio')(accountSid, authToken);

client.messages.create({
    to: "+15558675309",
    from: "+15017250604",
    body: "This is the ship that made the Kessel Run in fourteen parsecs?",
}, function(err, message) {
    console.log(message.sid);
});