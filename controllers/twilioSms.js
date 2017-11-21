var accountSid = 'ACe59061ce19c17d5d22f24f4030077216';
var authToken = 'c72ecbf92ae0157e39b97ace69aef668';

//require the Twilio module and create a REST client 
var client = require('twilio')(accountSid, authToken);

client.messages.create({
    to: "+917989856408",
    from: "+16364892045",
    body: result.JS_id.Firstname + " " + result.JS_id.Lastname + " is not ready to work on ",
}, function(err, message) {
    if (err) {} else {}

});