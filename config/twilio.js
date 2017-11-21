const config = require('./config');
var client = require('twilio')(config.twilio.accountSid, config.twilio.authToken);

var fromNumber = "+16364892045"

var TwilioService = function(data) {
    return new Promise(function(resolve, reject) {
        client.messages.create({
            to: data.to,
            from: fromNumber,
            body: data.body,
        }, function(err, message) {
            if (error) {
                reject({
                    success: false,
                    error: error,
                    data: null
                });
            }
            resolve({
                success: true,
                error: null,
                data: mailOptions
            });
        });
    });

}

module.exports = TwilioService;