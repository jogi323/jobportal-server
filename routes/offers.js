var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Availabilities = mongoose.model('Availabilities');
var User = mongoose.model('User');
var Payments = mongoose.model('Payments');
var Offers = mongoose.model('Offers');
var VerifyToken = mongoose.model('VerifyToken');
var OffersToken = mongoose.model('OffersToken');
var auth = require('./auth');
var crypto = require('crypto');
var MailService = require('../config/transport');
var TwilioService = require('../config/twilio');
var serverUrl = require('../config').serverUrl;
var Payments = mongoose.model('Payments');
var offerActions = require('../controllers/offerActions');
var Positions = mongoose.model('Positions');

var accountSid = 'ACe59061ce19c17d5d22f24f4030077216';
var authToken = 'c72ecbf92ae0157e39b97ace69aef668';

//require the Twilio module and create a REST client 
var client = require('twilio')(accountSid, authToken);


router.get('/jobseeker', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) { return res.status(500).json({ title: 'An error occurred', error: err }); }
        if (!user) { return res.status(401).json({ title: 'Not Authorised', error: { message: 'Login Again' } }) } else {
            Offers.find({ JS_id: user._id })
                .populate({
                    path: 'Availability_id',
                    select: ['Date'],
                })
                .exec(function(err, result) {
                    if (err) { return res.status(500).json({ title: 'An error occurred', error: err }); }
                    res.status(200).json({
                        data: result
                    });
                })
        }
    })
});

router.get('/employer', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) { return res.status(500).json({ title: 'An error occurred', error: err }); }
        if (!user) { return res.status(401).json({ title: 'Not Authorised', error: { message: 'Login Again' } }) } else {
            Offers.find({ Employer_id: user._id })
                .populate({
                    path: 'JS_id',
                    select: ['Hourly_Pay'],
                })
                .populate({
                    path: 'Availability_id',
                    select: ['Date'],
                })
                .where('Status').in(['HIRED', 'ACCEPTED'])
                // .where('Status').eq('ACCEPTED')
                .exec(function(err, result) {
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
            var offerList = req.body.availabilities;
            var paymentId = req.body.paymentId;
            offerList.forEach(function(offer) {
                User.findById(offer.JS_id._id)
                    .exec(function(err, js) {
                        if (err) {
                            return res.status(500).json({ title: 'Unable To create offer', error: err });
                        } else {
                            Offers.findOne({ 'Availability_id': offer._id, 'Employer_id': user._id }, function(err, result) {
                                if (err) { return res.status(500).json({ title: 'Unable To create offer', error: err }) }
                                if (result) {
                                    offerList.splice(0, 1);
                                    if (offerList.length === 0) {
                                        res.status(200).json({
                                            message: 'Offer request was already sent to Jobseeker',
                                        });
                                    }
                                } else {
                                    Positions.findById(offer.JS_id.Position._id, function(err, positionDetails) {
                                        if (err) {
                                            return res.status(500).json({ title: 'Unable To create offer', error: err })
                                        } else {
                                            var offers = new Offers();
                                            offers.Position_id = positionDetails.Position_Name;
                                            let messageId = crypto.randomBytes(2).toString('hex').toLocaleUpperCase();
                                            offers.Employer_id = user._id;
                                            offers.Availability_id = offer._id;
                                            offers.JS_id = offer.JS_id._id;
                                            offers.Date_Submitted = offer.Date_Submitted;
                                            offers.messageId = messageId;
                                            console.log(offers)
                                            offers.save(function(err, offerResult) {
                                                if (err) {
                                                    return res.status(500).json({ title: 'Unable To create offer', error: err })
                                                } else {

                                                    var token = new OffersToken();
                                                    token.offerId = offerResult._id;
                                                    token.token = crypto.randomBytes(16).toString('hex');
                                                    token.smsToken = crypto.randomBytes(2).toString('hex');
                                                    token.save(function(err) {
                                                        if (err) {
                                                            return res.status(500).json({
                                                                title: 'An error occurred',
                                                                error: err
                                                            });
                                                        } else {
                                                            Payments.findById(paymentId, function(err, paymentResult) {
                                                                if (err) {
                                                                    return res.status(500).json({
                                                                        title: 'An error occurred',
                                                                        error: err
                                                                    });
                                                                } else {

                                                                    var acceptOfferLink = serverUrl + 'acceptoffer/' + token.token;
                                                                    var rejectOfferLink = serverUrl + 'rejectoffer/' + token.token;
                                                                    var offerDate = offer.Date.toString().slice(0, 10);
                                                                    // var offerDate = offer.Date.toISOString().slice(0, 10);
                                                                    var mailOptions = {
                                                                        from: 'noreply@anydayemployment.com',
                                                                        to: js.Email_Address,
                                                                        subject: 'Congratulations ' + js.Firstname + '! We have a job offer for you',
                                                                        // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
                                                                        html: '<b>Hi <strong>' + js.Firstname + ',</strong></b><br>' +
                                                                            ' <p><b>' + user.Firstname + ' ' + user.Lastname + '</b>' + ' has offered you a job for position ' + '<b>' + positionDetails.Position_Name + '</b>' + ' on ' + offerDate + '</p>' +
                                                                            ' <p>' + 'If you are interested in this offer, accept the offer by accepting the link below' + '</p>' +
                                                                            ' <a href="' + acceptOfferLink + '">Accept Offer</a>' +
                                                                            ' <p>' + 'To decline the job offer follow the link below' + '</p>' +
                                                                            ' <a href="' + rejectOfferLink + '">Reject Offer</a>' +
                                                                            ' <p>Administrator</p>' +
                                                                            ' <p>AnyDay Employment</p>'
                                                                    };
                                                                    MailService(mailOptions)
                                                                        .then(response => {
                                                                            offerList.splice(0, 1);
                                                                            console.log(user.Offers_id);
                                                                            user.Offers_id.push(offerResult._id)
                                                                            js.Offers_id.push(offerResult);
                                                                            paymentResult.JS_id.push(offer.JS_id._id);
                                                                            paymentResult.Offers_id.push(offerResult);

                                                                            js.save();
                                                                            var data = {
                                                                                to: js.Phone1,
                                                                                body: "Hi " + js.Firstname + ", " + user.Firstname + " " + user.Lastname + " has offered a job for positon " + offer.JS_id.Position + " on " + offerDate + " to aceept send " + "'ACCEPT " + token.smsToken + "'" + ", to decline send " + "'DECLINE " + token.smsToken + "'" + " to +18448223442"
                                                                            }
                                                                            TwilioService(data)
                                                                                .then(result => {
                                                                                    if (offerList.length === 0) {
                                                                                        console.log("+++++++++")
                                                                                        console.log("+++++++++")
                                                                                        console.log(user.Offers_id)
                                                                                        console.log("+++++++++")
                                                                                        console.log("+++++++++")

                                                                                        paymentResult.save(function(err) {
                                                                                            if (err) {

                                                                                            } else {
                                                                                                user.save();
                                                                                            }
                                                                                        })
                                                                                        res.status(200).json({
                                                                                            message: 'Offer Created and Request was sent to MAIL and SMS',
                                                                                        });
                                                                                    }
                                                                                })
                                                                                .catch(err => {
                                                                                    if (offerList.length === 0) {
                                                                                        res.status(200).json({
                                                                                            message: 'Offer Created and Request was sent to MAIL',
                                                                                        });
                                                                                    }
                                                                                })

                                                                        })
                                                                        .catch(err => {
                                                                            return res.status(500).json({
                                                                                title: 'An error occurred',
                                                                                error: err
                                                                            });
                                                                        })
                                                                }
                                                            })
                                                        }
                                                    });

                                                }
                                            })
                                        }
                                    })

                                }
                            })
                        }
                    })
            });
        }
    })
});


getOfferDetails = function(req, res, jsRespone) {
    OffersToken.findOne({ token: req.params.id })
        .populate({
            path: 'offerId',
            populate: {
                path: 'JS_id',
                model: 'User',
                select: ['Firstname', 'Lastname', 'Phone1', 'Email_Address', 'Position'],
            }
        })
        .populate({
            path: 'offerId',
            populate: {
                path: 'Employer_id',
                model: 'User',
                select: ['Firstname', 'Lastname', 'Contact_Phone_Nr', 'Contact_Person', 'Email_Address'],
            }
        })
        .populate({
            path: 'offerId',
            populate: {
                path: 'Availability_id',
                model: 'Availabilities',
                select: ['Date'],
            }
        })
        .exec(function(err, offerDetails) {
            if (err) {
                return res.status(500).json({ title: 'An error occurred', error: err });
            }
            if (!offerDetails) {
                return res.status(401).json({
                    title: 'Offer No longer Available or expired,  check the status of your job offers below',
                    error: { message: 'Offer Expired' }
                });
            } else {
                if (jsRespone === 'ACCEPT') {
                    offerActions.accept(offerDetails, res)
                }
                if (jsRespone === 'REJECT') {
                    offerActions.reject(offerDetails, res)
                }
                if (jsRespone === 'ACCEPTJS') {
                    offerActions.acceptjs(offerDetails, res)
                }
                if (jsRespone === 'REJECTJS') {
                    offerActions.rejectjs(offerDetails, res)
                }
                if (jsRespone === 'RTW') {
                    offerActions.rtw(offerDetails, res)
                }
                if (jsRespone === 'NRTW') {
                    offerActions.nrtw(offerDetails, res)
                }

            }
        })
}

router.get('/accept/:id', function(req, res) {
    getOfferDetails(req, res, 'ACCEPT')
})

router.get('/reject/:id', function(req, res) {
    getOfferDetails(req, res, 'REJECT')
})

router.get('/acceptjs/:id', function(req, res) {
    getOfferDetails(req, res, 'ACCEPTJS')
})

router.get('/rejectjs/:id', function(req, res) {
    getOfferDetails(req, res, 'REJECTJS')
})

router.get('/rtw/:id', function(req, res) {
    getOfferDetails(req, res, 'RTW')
})

router.get('/nrtw/:id', function(req, res) {
    getOfferDetails(req, res, 'NRTW')
})

router.post('/reply', function(req, res) {
    jsRespone = req.body.Body.split(" ")[0];
    jsMessageId = req.body.Body.split(" ")[1];
    var smsKeys = ['ACCEPT', 'DECLINE', 'SELECT', 'REJECT', 'RTW', 'NRTW']
    var twilio = require('twilio');
    var twiml = new twilio.twiml.MessagingResponse();

    OffersToken.findOne({ smsToken: jsMessageId })
        .populate({
            path: 'offerId',
            populate: {
                path: 'JS_id',
                model: 'User',
                select: ['Firstname', 'Lastname', 'Phone1', 'Email_Address', 'Position'],
            }
        })
        .populate({
            path: 'offerId',
            populate: {
                path: 'Employer_id',
                model: 'User',
                select: ['Firstname', 'Lastname', 'Contact_Phone_Nr', 'Contact_Person', 'Email_Address'],
            }
        })
        .populate({
            path: 'offerId',
            populate: {
                path: 'Availability_id',
                model: 'Availabilities',
                select: ['Date'],
            }
        })
        .exec(function(err, offerDetails) {
            if (err) {} else if (smsKeys.indexOf(jsRespone) === -1) {
                twiml.message('OOPS! You have sent wrong key word, Send back correct key work');
                res.writeHead(200, { 'Content-Type': 'text/xml' });
                res.end(twiml.toString());
            } else if (!offerDetails) {
                twiml.message('Offer No longer Available or expired,  check the status of your job offers At Any Day Employment');
                res.writeHead(200, { 'Content-Type': 'text/xml' });
                res.end(twiml.toString());
            } else if (typeof offerDetails !== 'undefined' && jsRespone === 'ACCEPT') {
                offerActions.accept(offerDetails, res)
            } else if (typeof offerDetails !== 'undefined' && jsRespone === 'DECLINE') {
                offerActions.reject(offerDetails, res)
            } else if (typeof offerDetails !== 'undefined' && jsRespone === 'SELECT') {
                offerActions.acceptjs(offerDetails, res)
            } else if (typeof offerDetails !== 'undefined' && jsRespone === 'REJECT') {
                offerActions.rejectjs(offerDetails, res)
            } else if (typeof offerDetails !== 'undefined' && jsRespone === 'RTW') {
                offerActions.rtw(offerDetails, res)
            } else if (typeof offerDetails !== 'undefined' && jsRespone === 'NRTW') {
                offerActions.nrtw(offerDetails, res)
            } else {
                twiml.message('Offer No longer Available or expired,  check the status of your job offers At Any Day Employment');
                res.writeHead(200, { 'Content-Type': 'text/xml' });
                res.end(twiml.toString());
            }
        })

})
module.exports = router;