var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Availabilities = mongoose.model('Availabilities');
var User = mongoose.model('User');
var Payments = mongoose.model('Payments');
var Offers = mongoose.model('Offers');
var VerifyToken = mongoose.model('VerifyToken');
var auth = require('./auth');

var accountSid = 'ACe59061ce19c17d5d22f24f4030077216';
var authToken = 'c72ecbf92ae0157e39b97ace69aef668';

//require the Twilio module and create a REST client 
var client = require('twilio')(accountSid, authToken);


router.get('/all', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) { return res.status(500).json({ title: 'An error occurred', error: err }); }
        if (!user) { return res.status(401).json({ title: 'Not Authorised', error: { message: 'Login Again' } }) } else {
            Availabilities.find({ JS_id: user._id }, function(err, result) {
                if (err) { return res.status(500).json({ title: 'An error occurred', error: err }); }
                res.status(200).json({
                    data: result
                });
            })
        }
    })
});


router.post('/save', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) { return res.status(500).json({ title: 'An error occurred', error: err }); }
        if (!user) { return res.status(401).json({ title: 'Not Authorised', error: { message: 'Login Again' } }) } else {
            var offerList = req.body;
            console.log(req.body)
            offerList.forEach(function(offer) {
                User.findById(offer.JS_id, function(err, result) {
                    if (err) {
                        return res.status(500).json({ title: 'Unable To create offer', error: err });
                    } else {
                        client.messages.create({
                            to: "+91" + result.Phone1,
                            from: "+16364892045",
                            body: user.Firstname + user.Lastname + "has a job offer for you, send 'ACCEPT' to '+16364892045' to accept the offer",
                        }, function(err, message) {
                            if (err) {
                                return res.status(500).json({ title: 'Unable To create offer', error: err });
                            } else {
                                console.log(message.sid);
                                var offers = new Offers();
                                offers.Employer_id = user._id;
                                offers.Availability_id = offer.Availability_id;
                                offers.JS_id = offer.JS_id;
                                offer.Date_Submitted = offer.Date_Submitted;
                                offer.messageSid = message.sid;
                                Offers.find({ 'Availability_id': offer.Availability_id, 'Employer_id': user._id }, function(err, result) {
                                    if (err) { return res.status(500).json({ title: 'Unable To create offer', error: err }) }
                                    if (result) {
                                        offerList.splice(0, 1);
                                    } else {
                                        offers.save(function(err, result) {
                                            if (err) { return res.status(500).json({ title: 'Unable To create offer', error: err }); } else {
                                                user.Offers_id.push(result);

                                                offerList.splice(0, 1);
                                                if (offerList.length === 0) {
                                                    user.save();
                                                    res.status(200).json({
                                                        message: 'Offer Created and Request was sent',
                                                    });
                                                }
                                            }
                                        })
                                    }
                                })

                            }

                        });
                    }
                })
            });
        }
    })
});


router.post('/sms', function(req, res) {
    var twilio = require('twilio');
    var twiml = new twilio.TwimlResponse();
    twiml.message('.!..');
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
});


module.exports = router;