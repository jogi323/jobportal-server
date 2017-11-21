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
                    path: 'JS_id',
                    select: ['Firstname', 'Lastname', 'Speciality'],
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
                    select: ['Firstname', 'Lastname', 'Position', 'Hourly_Pay'],
                })
                .where('Status').eq('ACCEPTED')
                .where('Ready_to_work').eq('ACCEPTED')
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
            var offerList = req.body;
            offerList.forEach(function(offer) {
                User.findById(offer.JS_id._id, function(err, js) {
                    if (err) {
                        return res.status(500).json({ title: 'Unable To create offer', error: err });
                    } else {
                        Offers.findOne({ 'Availability_id': offer._id, 'Employer_id': user._id }, function(err, result) {
                            if (err) { return res.status(500).json({ title: 'Unable To create offer', error: err }) }
                            if (result) {
                                offerList.splice(0, 1);
                                if (offerList.length === 0) {
                                    res.status(200).json({
                                        message: 'Offer Created and Request was sent',
                                    });
                                }
                            } else {
                                var offers = new Offers();
                                let messageId = crypto.randomBytes(2).toString('hex').toLocaleUpperCase();
                                offers.Employer_id = user._id;
                                offers.Availability_id = offer._id;
                                offers.JS_id = offer.JS_id._id;
                                offers.Date_Submitted = offer.Date_Submitted;
                                // offers.messageSid = message.sid;
                                offers.messageId = messageId;
                                offers.save(function(err, offerResult) {
                                    if (err) {
                                        return res.status(500).json({ title: 'Unable To create offer', error: err })
                                    } else {
                                        var token = new OffersToken();
                                        token.offerId = offerResult._id;
                                        token.token = crypto.randomBytes(16).toString('hex')
                                        token.save(function(err) {
                                            if (err) {
                                                return res.status(500).json({
                                                    title: 'An error occurred',
                                                    error: err
                                                });
                                            } else {
                                                var acceptOfferLink = serverUrl + 'acceptoffer/' + token.token;
                                                var rejectOfferLink = serverUrl + 'rejectoffer/' + token.token;
                                                var offerDate = offer.Date
                                                    // var offerDate = offer.Date.toISOString().slice(0, 10);
                                                var mailOptions = {
                                                    from: 'ashokona@gmail.com',
                                                    to: js.Email_Address,
                                                    subject: 'Congratulations ' + user.Firstname + ', Welcome to Employment - Dental Connections',
                                                    // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
                                                    html: '<b>Hi, <strong>' + js.Firstname + '</strong></b><br>' +
                                                        ' <p><b>' + user.Firstname + ' ' + user.Lastname + '</b>' + ' has offerd you a job for position ' + '<b>' + offer.JS_id.Position + '</b>' + ' on ' + offerDate + '</p>' +
                                                        ' <p>' + 'If you are interested in this offer, accept the offer by accepting the link below' + '</p>' +
                                                        ' <a href="' + acceptOfferLink + '">Accept Offer</a>' +
                                                        ' <p>' + 'To decline the job offer follow the link below' + '</p>' +
                                                        ' <a href="' + rejectOfferLink + '">Reject Offer</a>' +
                                                        ' <p>Administrator</p>' +
                                                        ' <p>At Employment</p>'
                                                };

                                                MailService(mailOptions)
                                                    .then(result => {
                                                        offerList.splice(0, 1);
                                                        if (offerList.length === 0) {
                                                            res.status(200).json({
                                                                message: 'Offer Created and Request was sent',
                                                            });
                                                        }
                                                    })
                                                    .catch(err => {
                                                        return res.status(500).json({
                                                            title: 'An error occurred',
                                                            error: err
                                                        });
                                                    })
                                            }
                                        });

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

router.post('/sms', function(req, res) {

    jsRespone = req.body.Body.split(" ")[0];
    jsMessageId = req.body.Body.split(" ")[1];
    console.log(jsRespone)
    console.log(jsMessageId)
    console.log("----strated---");
    var twilio = require('twilio');
    var twiml = new twilio.twiml.MessagingResponse();
    if (jsRespone === 'ACCEPT' && typeof jsMessageId !== 'undefined') {
        console.log("----if called----")
        Offers.findOne({ 'messageId': req.body.Body.split(" ")[1] })
            .populate({
                path: 'Employer_id',
                select: ['Firstname', 'Lastname', 'Contact_Phone_Nr', 'Contact_Person'],
            })
            .populate({
                path: 'JS_id',
                select: ['Firstname', 'Lastname', 'Phone1'],
            })
            .exec(function(err, result) {
                console.log("----db called----")
                console.log(result)
                if (err) {
                    twiml.message('OOPS!! Something went wrong, please contact our administrator');
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    res.end(twiml.toString());
                } else if (result.Status === 'PENDING') {
                    result.Status = 'ACCEPTED';
                    result.Ready_to_work = 'PENDING';
                    result.save(function(err) {
                        if (err) {
                            twiml.message('OOPS!! Something went wrong, please contact our administrator');
                            res.writeHead(200, { 'Content-Type': 'text/xml' });
                            res.end(twiml.toString());
                        } else {
                            client.messages.create({
                                to: "+917989856408",
                                from: "+16364892045",
                                body: "Hi, " + result.JS_id.Firstname + " " + result.JS_id.Lastname + " has accepted your job offer and meassage  was sent to him to report to work",
                            }, function(err, message) {
                                if (err) {
                                    return res.status(500).json({ title: 'Unable To Send Request', error: err });
                                } else {
                                    console.log("You have accepted " + result.Employer_id.Firstname + " " + result.Employer_id.Lastname + " job offer to report to work send " + "'" + 'RTW ' + result.messageId + "'" + " if not ready to work send" + "'" + "NRTW " + result.messageId + "'" + " to '+16364892045' ");
                                    twiml.message("You have accepted " + result.Employer_id.Firstname + " " + result.Employer_id.Lastname + " job offer to report to work send " + "'" + 'RTW ' + result.messageId + "'" + " if not ready to work send" + "'" + "NRTW " + result.messageId + "'" + " to '+16364892045' ");
                                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                                    res.end(twiml.toString());
                                }

                            });
                        }
                    })
                } else if (result.Status === 'ACCEPTED') {
                    if (err) {
                        twiml.message('OOPS!! Something went wrong, please contact our administrator');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    } else {
                        twiml.message("Hi, You have already accepted " + result.Employer_id.Firstname + " " + result.Employer_id.Lastname + " job offer, To report to work send " + "'" + 'RTW ' + result.messageId + "'" + " if not ready to work send" + "'" + "NRTW " + result.messageId + "'" + " to '+16364892045' ");
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    }
                } else if (result.Status === 'DECLINED') {
                    if (err) {
                        twiml.message('OOPS!! Something went wrong, please contact our administrator');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    } else {
                        twiml.message('Sorry Job offer no longer  available');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    }
                } else if (result.Status === 'EXPIRED') {
                    if (err) {
                        twiml.message('OOPS!! Something went wrong, please contact our administrator');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    } else {
                        twiml.message('Sorry offer  no longer  available');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    }

                } else {
                    twiml.message('Sorry Job offer no longer  available');
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    res.end(twiml.toString());
                }
            })
    } else if (jsRespone === 'DECLINE' && typeof jsMessageId !== 'undefined') {
        Offers.findOne({ 'messageId': req.body.Body.split(" ")[1] })
            .populate('Employer_id', 'Firstname')
            .exec(function(err, result) {
                if (err) {
                    twiml.message('OOPS!! Something went wrong, please contact our administrator');
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    res.end(twiml.toString());
                } else if (result.Status === 'PENDING') {
                    result.Status = 'DECLINED';
                    result.Ready_to_work = 'DECLINED';
                    result.save(function(err) {
                        if (err) {
                            twiml.message('OOPS!! Something went wrong, please contact our administrator');
                            res.writeHead(200, { 'Content-Type': 'text/xml' });
                            res.end(twiml.toString());
                        } else {
                            client.messages.create({
                                to: "+917989856408",
                                from: "+16364892045",
                                body: "Hi, " + result.JS_id.Firstname + " " + result.JS_id.Lastname + " has declined your job offer, You can search for other available job Seekers",
                            }, function(err, message) {
                                if (err) {
                                    return res.status(500).json({ title: 'Unable To Send Request', error: err });
                                } else {
                                    twiml.message("You have declined job offered to you by" + result.Employer_id.Firstname + " " + result.Employer_id.Lastname);
                                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                                    res.end(twiml.toString());
                                }

                            });
                        }
                    })
                } else if (result.Status === 'ACCEPTED') {
                    if (err) {
                        twiml.message('OOPS!! Something went wrong, please contact our administrator');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    } else {
                        twiml.message("Hi, you have already accepted " + result.Employer_id.Firstname + " " + result.Employer_id.Lastname + " job offer, To report to work send " + "'" + 'RTW ' + result.messageId + "'" + " if not ready to work send" + "'" + "NRTW " + result.messageId + "'" + " to '+16364892045' ");
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    }
                } else if (result.Status === 'DECLINED') {
                    if (err) {
                        twiml.message('OOPS!! Something went wrong, please contact our administrator');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    } else {
                        twiml.message('You have already declined the offer');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    }
                } else if (result.Status === 'EXPIRED') {
                    if (err) {
                        twiml.message('OOPS!! Something went wrong, please contact our administrator');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    } else {
                        twiml.message('Sorry offer no longer  available');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    }

                } else {
                    twiml.message('Sorry offer no longer  available');
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    res.end(twiml.toString());
                }
            })
    } else if (jsRespone === 'RTW' && typeof jsMessageId !== 'undefined') {
        Offers.findOne({ 'messageId': req.body.Body.split(" ")[1] })
            .populate({
                path: 'Employer_id',
                select: ['Firstname', 'Lastname', 'Contact_Phone_Nr', 'Contact_Person'],
            })
            .populate({
                path: 'JS_id',
                select: ['Firstname', 'Lastname', 'Phone1'],
            })
            .exec(function(err, result) {
                if (err) {
                    twiml.message('OOPS!! Something went wrong, please contact our administrator');
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    res.end(twiml.toString());
                } else if (result.Status === 'ACCEPTED' && result.Ready_to_work === 'PENDING') {

                    result.Ready_to_work = 'ACCEPTED';
                    result.save(function(err) {
                        if (err) {
                            twiml.message('OOPS!! Something went wrong, please contact our administrator');
                            res.writeHead(200, { 'Content-Type': 'text/xml' });
                            res.end(twiml.toString());
                        } else {
                            console.log('sucess')
                            Offers.find({ 'Availability_id': result.Availability_id, 'JS_id': result.JS_id })
                                .where('Status').ne('ACCEPTED')
                                .where('Ready_to_work').ne('ACCEPTED')
                                .updateMany({ $set: { Status: "EXPIRED", Ready_to_work: "EXPIRED" } })
                                .exec(function(err, offers) {
                                    if (err) {
                                        twiml.message('OOPS!! Something went wrong, please contact our administrator');
                                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                                        res.end(twiml.toString());
                                    } else {
                                        Availabilities.updateMany({ '_id': result.Availability_id }, { $set: { Hired: true } }, function(err, data) {
                                            if (err) {
                                                twiml.message('OOPS!! Something went wrong, please contact our administrator');
                                                res.writeHead(200, { 'Content-Type': 'text/xml' });
                                                res.end(twiml.toString());
                                            } else {
                                                client.messages.create({
                                                    to: "+917989856408",
                                                    from: "+16364892045",
                                                    body: result.JS_id.Firstname + " " + result.JS_id.Lastname + " has accepted you job offer and reports to work on " + data.Date,
                                                }, function(err, message) {
                                                    if (err) {
                                                        console.log(error);
                                                        return res.status(500).json({ title: 'Unable To Send Request', error: err });
                                                    } else {
                                                        console.log("Congrats! you choose to work with " + result.Employer_id.Firstname + " " + result.Employer_id.Lastname + " on " + data.Date + " please contact " + result.Employer_id.Contact_Person + " on " + result.Employer_id.Contact_Phone_Nr)
                                                        twiml.message('Congrats! your offer has been sucessfully created, please report to work');
                                                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                                                        res.end(twiml.toString());

                                                    }

                                                });

                                            }
                                        })
                                    }

                                })
                        }
                    })
                } else if (result.Status === 'PENDING' && result.Ready_to_work === 'PENDING') {
                    if (err) {
                        twiml.message('OOPS!! Something went wrong, please contact our administrator');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    } else {
                        twiml.message('Please Accept job offer first to report to work');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    }
                } else if (result.Ready_to_work === 'DECLINED') {
                    if (err) {
                        twiml.message('OOPS!! Something went wrong, please contact our administrator');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    } else {
                        twiml.message('You have already declined the offer');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    }
                } else if (result.Ready_to_work === 'EXPIRED') {
                    if (err) {
                        twiml.message('OOPS!! Something went wrong, please contact our administrator');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    } else {
                        twiml.message('Sorry offer no longer  available');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    }

                } else {
                    twiml.message('Sorry job offer no longer  available');
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    res.end(twiml.toString());
                }
            })
    } else if (jsRespone === 'NRTW' && typeof jsMessageId !== 'undefined') {
        Offers.findOne({ 'messageId': req.body.Body.split(" ")[1] })
            .populate('Employer_id', 'Firstname')
            .exec(function(err, result) {
                if (err) {
                    twiml.message('OOPS!! Something went wrong, please contact our administrator');
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    res.end(twiml.toString());
                } else if (result.Ready_to_work === 'PENDING') {

                    result.Ready_to_work = 'DECLINED';
                    result.save(function(err) {
                        if (err) {
                            twiml.message('OOPS!! Something went wrong, please contact our administrator');
                            res.writeHead(200, { 'Content-Type': 'text/xml' });
                            res.end(twiml.toString());
                        } else {
                            client.messages.create({
                                to: "+917989856408",
                                from: "+16364892045",
                                body: result.JS_id.Firstname + " " + result.JS_id.Lastname + " is not ready to work on ",
                            }, function(err, message) {
                                if (err) {
                                    console.log(error);
                                    return res.status(500).json({ title: 'Unable To Send Request', error: err });
                                } else {
                                    twiml.message("Hi, " + result.JS_id.Firstname + " " + result.JS_id.Lastname + " You choose not to work on the accepted job offer, which is not recomended!");
                                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                                    res.end(twiml.toString());

                                }

                            });
                        }
                    })
                } else if (result.Ready_to_work === 'DECLINED') {
                    if (err) {
                        twiml.message('OOPS!! Something went wrong, please contact our administrator');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    } else {
                        twiml.message('You have already declined the offer');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    }
                } else if (result.Status === 'DECLINED' && result.Ready_to_work === 'PENDING') {
                    if (err) {
                        twiml.message('OOPS!! Something went wrong, please contact our administrator');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    } else {
                        twiml.message('Sorry offer no longer  available');
                        res.writeHead(200, { 'Content-Type': 'text/xml' });
                        res.end(twiml.toString());
                    }

                } else {
                    twiml.message('offer  no longer  available');
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    res.end(twiml.toString());
                }
            })
    } else {
        twiml.message('Incorrect code sent Pleasse send the correct code with ACCEPT or REJECT message');
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml.toString());
    }

});

router.get('/accept/:id', function(req, res) {
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
                console.log(err);
                return res.status(500).json({ title: 'An error occurred', error: err });
            }
            if (!offerDetails) {
                return res.status(401).json({
                    title: 'Offer No longer Available or expired,  check the status of your job offers below',
                    error: { message: 'Offer Expired' }
                });
            }
            if (typeof offerDetails !== 'undefined' && offerDetails.offerId.Status === 'ACCEPTED') {
                res.status(200).send({ message: "You have already accepted the job offer by, " + offerDetails.offerId.JS_id.Firstname + ' ' + offerDetails.offerId.JS_id.Lastname + " for the position " + offerDetails.offerId.JS_id.Position + " on " + offerDate + " Request was sent to employer, please wait for the response" });
            } else {
                var token = new OffersToken();
                token.offerId = offerDetails.offerId._id;
                token.token = crypto.randomBytes(16).toString('hex')
                token.save(function(err, result) {
                    if (err) {
                        if (err) {
                            console.log(err)
                            return res.status(500).json({
                                title: 'An error occurred',
                                error: err
                            });
                        }
                    } else {
                        var acceptJSLink = serverUrl + 'acceptjobseeker/' + token.token;
                        var rejectJSLink = serverUrl + 'rejectjobseeker/' + token.token;
                        var offerDate = offerDetails.offerId.Availability_id.Date.toISOString().slice(0, 10);
                        var mailOptions = {
                            from: 'ashokona@gmail.com',
                            to: offerDetails.offerId.Employer_id.Email_Address,
                            subject: offerDetails.offerId.Employer_id.Firstname + ', Has Accepted Your job offer',
                            // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
                            html: '<b>Hi, <strong>' + offerDetails.offerId.Employer_id.Firstname + '</strong></b><br>' +
                                ' <p>' + '<strong>' + offerDetails.offerId.JS_id.Firstname + ' ' + offerDetails.offerId.JS_id.Lastname + '</strong>' + ' has accepted your job offer for position ' + '<b>' + offerDetails.offerId.JS_id.Position + '</b>' + ' on ' + offerDate + '</p>' +
                                ' <p>' + ' To choose this job seeker and Invite him to work ' + '</p>' +
                                ' <a href="' + acceptJSLink + '">Report To work</a>' +
                                ' <p>' + ' if you prefer to choose other jobseeker cancel the current job seekers offer ' + '</p>' +
                                ' <a href="' + rejectJSLink + '">Cancel Offer</a>' +
                                ' <p>Administrator</p>' +
                                ' <p>At Employment</p>'
                        };

                        MailService(mailOptions)
                            .then(result => {
                                offerDetails.remove();
                                Offers.update({ _id: offerDetails.offerId._id }, { Status: 'ACCEPTED' },
                                    function(err, data) {
                                        if (err) {
                                            console.log("update error")
                                            return res.status(500).json({
                                                title: 'An error occurred',
                                                error: err
                                            });
                                        } else {
                                            res.status(200).send({ message: "Congrats your have accepted the job offer by, " + offerDetails.offerId.JS_id.Firstname + ' ' + offerDetails.offerId.JS_id.Lastname + " for the position " + offerDetails.offerId.JS_id.Position + " on " + offerDate + " Request was sent to employer, please wait for the response" });

                                        }
                                    });
                            })
                            .catch(err => {
                                console.log(err)
                                return res.status(500).json({
                                    title: 'An error occurred',
                                    error: err
                                });
                            })
                    }
                })
            }
        })
})

router.get('/reject/:id', function(req, res) {
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
                console.log(err);
                return res.status(500).json({ title: 'An error occurred', error: err });
            }
            if (!offerDetails) {
                return res.status(401).json({
                    title: 'Offer No longer Available or expired,  check the status of your job offers below',
                    error: { message: 'Offer Expired' }
                });
            } else {
                var token = new OffersToken();
                token.offerId = offerDetails.offerId._id;
                token.token = crypto.randomBytes(16).toString('hex')
                token.save(function(err, result) {
                    if (err) {
                        if (err) {
                            console.log(err)
                            return res.status(500).json({
                                title: 'An error occurred',
                                error: err
                            });
                        }
                    } else {

                        var offerDate = offerDetails.offerId.Availability_id.Date.toISOString().slice(0, 10);
                        var mailOptions = {
                            from: 'ashokona@gmail.com',
                            to: offerDetails.offerId.Employer_id.Email_Address,
                            subject: offerDetails.offerId.Employer_id.Firstname + ', Has Declined Your job offer',
                            // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
                            html: '<b>Hi, <strong>' + offerDetails.offerId.Employer_id.Firstname + '</strong></b><br>' +
                                ' <p>' + '<strong>' + offerDetails.offerId.JS_id.Firstname + ' ' + offerDetails.offerId.JS_id.Lastname + '</strong>' + ' has declined your job offer for position ' + '<b>' + offerDetails.offerId.JS_id.Position + '</b>' + ' on ' + offerDate + '</p>' +
                                ' <p>' + ' There are few other jobseekers ready to work, Login to DEntal Assistant and choose any one from them' + '</p>' +
                                ' <p>Administrator</p>' +
                                ' <p>At Employment</p>'
                        };

                        MailService(mailOptions)
                            .then(result => {
                                offerDetails.remove();
                                Offers.update({ _id: offerDetails.offerId._id }, { Status: 'DECLINED', Ready_to_work: 'DECLINED' },
                                    function(err, data) {
                                        if (err) {
                                            console.log("update error")
                                            return res.status(500).json({
                                                title: 'An error occurred',
                                                error: err
                                            });
                                        } else {
                                            res.status(200).send({ message: "You have rejected job offer by " + offerDetails.offerId.JS_id.Firstname + ' ' + offerDetails.offerId.JS_id.Lastname + " for the position " + offerDetails.offerId.JS_id.Position + " on " + offerDate + ". There are more job offer waiting for you!" });
                                        }
                                    });

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
        })
})

router.get('/acceptjs/:id', function(req, res) {
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
                console.log(err);
                return res.status(500).json({ title: 'An error occurred', error: err });
            }
            if (!offerDetails) {
                return res.status(401).json({
                    title: 'Offer No longer Available or expired,  check the status of your job offers below',
                    error: { message: 'Offer Expired' }
                });
            } else {
                var token = new OffersToken();
                token.offerId = offerDetails.offerId._id;
                token.token = crypto.randomBytes(16).toString('hex')
                token.save(function(err, result) {
                    if (err) {
                        if (err) {
                            console.log(err)
                            return res.status(500).json({
                                title: 'An error occurred',
                                error: err
                            });
                        }
                    } else {
                        var jobseekerRtw = serverUrl + 'jobseekerrtw/' + token.token;
                        var declineNrtwLink = serverUrl + 'jobseekernrtw/' + token.token;
                        var offerDate = offerDetails.offerId.Availability_id.Date.toISOString().slice(0, 10)
                        var mailOptions = {
                            from: 'ashokona@gmail.com',
                            to: offerDetails.offerId.JS_id.Email_Address,
                            subject: offerDetails.offerId.Employer_id.Firstname + ', Has Accepted Your job offer',
                            // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
                            html: '<b>Hi, <strong>' + offerDetails.offerId.JS_id.Firstname + '</strong></b><br>' +
                                ' <p>' + '<strong>' + offerDetails.offerId.Employer_id.Firstname + ' ' + offerDetails.offerId.Employer_id.Lastname + '</strong>' + ' has accepted your job offer for position ' + offerDetails.offerId.JS_id.Position + ' on ' + offerDate + '</p>' +
                                ' <p>' + ' To confirm and report and report to work, follow link below' + '</p>' +
                                ' <a href="' + jobseekerRtw + '">Report To work</a>' +
                                ' <p>' + ' To confirm and report and report to work, follow link below' + '</p>' +
                                ' <a href="' + declineNrtwLink + '">Cancel Offer</a>' +
                                ' <p>Administrator</p>' +
                                ' <p>At Employment</p>'
                        };

                        MailService(mailOptions)
                            .then(result => {
                                offerDetails.remove();
                                Offers.update({ _id: offerDetails.offerId._id }, { Status: 'ACCEPTED' },
                                    function(err, data) {
                                        if (err) {
                                            console.log("update error")
                                            return res.status(500).json({
                                                title: 'An error occurred',
                                                error: err
                                            });
                                        } else {
                                            res.status(200).send({ message: "You have selected jobseeker, " + offerDetails.offerId.Employer_id.Firstname + ' ' + offerDetails.offerId.Employer_id.Lastname + " for position " + offerDetails.offerId.JS_id.Position + " on " + offerDate + ". Login here to check the status of joboffers " });

                                        }
                                    });
                            })
                            .catch(err => {
                                console.log(err)
                                return res.status(500).json({
                                    title: 'An error occurred',
                                    error: err
                                });
                            })



                    }
                })
            }
        })
})

router.get('/rejectjs/:id', function(req, res) {
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
                console.log(err);
                return res.status(500).json({ title: 'An error occurred', error: err });
            }
            if (!offerDetails) {
                return res.status(401).json({
                    title: 'Offer No longer Available or expired,  check the status of your job offers below',
                    error: { message: 'Offer Expired' }
                });
            } else {
                var token = new OffersToken();
                token.offerId = offerDetails.offerId._id;
                token.token = crypto.randomBytes(16).toString('hex')
                token.save(function(err, result) {
                    if (err) {
                        if (err) {
                            console.log(err)
                            return res.status(500).json({
                                title: 'An error occurred',
                                error: err
                            });
                        }
                    } else {

                        var offerDate = offerDetails.offerId.Availability_id.Date.toISOString().slice(0, 10);
                        var mailOptions = {
                            from: 'ashokona@gmail.com',
                            to: offerDetails.offerId.Employer_id.Email_Address,
                            subject: offerDetails.offerId.Employer_id.Firstname + ', Has Declined Your job offer',
                            // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
                            html: '<b>Hi, <strong>' + offerDetails.offerId.Employer_id.Firstname + '</strong></b><br>' +
                                ' <p>' + '<strong>' + offerDetails.offerId.JS_id.Firstname + ' ' + offerDetails.offerId.JS_id.Lastname + '</strong>' + ' has declined your job offer for position ' + offerDetails.offerId.JS_id.Position + ' on ' + offerDate + '</p>' +
                                ' <p>' + ' There are few other jobseekers ready to work, Login to DEntal Assistant and choose any one from them' + '</p>' +
                                ' <p>Administrator</p>' +
                                ' <p>At Employment</p>'
                        };

                        MailService(mailOptions)
                            .then(result => {
                                offerDetails.remove();
                                Offers.update({ _id: offerDetails.offerId._id }, { Status: 'DECLINED', Ready_to_work: 'DECLINED' },
                                    function(err, data) {
                                        if (err) {
                                            console.log("update error")
                                            return res.status(500).json({
                                                title: 'An error occurred',
                                                error: err
                                            });
                                        } else {
                                            res.status(200).send({ message: "You have rejected job seeker " + offerDetails.offerId.JS_id.Firstname + ' ' + offerDetails.offerId.JS_id.Lastname + " for the position " + offerDetails.offerId.JS_id.Position + " on " + offerDate + ". There are more job seekers to work!" });
                                        }
                                    });

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
        })
})

router.get('/rtw/:id', function(req, res) {
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
                console.log(err);
                return res.status(500).json({ title: 'An error occurred', error: err });
            }
            if (!offerDetails) {
                return res.status(401).json({
                    title: 'Offer No longer Available or expired,  check the status of your job offers below',
                    error: { message: 'Offer Expired' }
                });
            } else {
                var token = new OffersToken();
                token.offerId = offerDetails.offerId._id;
                token.token = crypto.randomBytes(16).toString('hex')
                token.save(function(err, result) {
                    if (err) {
                        if (err) {
                            console.log(err)
                            return res.status(500).json({
                                title: 'An error occurred',
                                error: err
                            });
                        }
                    } else {

                        var offerDate = offerDetails.offerId.Availability_id.Date.toISOString().slice(0, 10);

                        var mailOptions = {
                            from: 'ashokona@gmail.com',
                            to: offerDetails.offerId.Employer_id.Email_Address,
                            subject: offerDetails.offerId.Employer_id.Firstname + ', Has Accepted Your job offer',
                            // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
                            html: '<b>Hi, <strong>' + offerDetails.offerId.Employer_id.Firstname + '</strong></b><br>' +
                                ' <p>' + '<strong>' + offerDetails.offerId.JS_id.Firstname + ' ' + offerDetails.offerId.JS_id.Lastname + '</strong>' + ' is ready to work for your job offer for position ' + offerDetails.offerId.JS_id.Position + ' on ' + offerDate + '</p>' +
                                ' <p>Administrator</p>' +
                                ' <p>At Employment</p>'
                        };

                        MailService(mailOptions)
                            .then(result => {
                                offerDetails.remove();
                                Offers.update({ _id: offerDetails.offerId._id }, { Ready_to_work: 'ACCEPTED' },
                                    function(err, data) {
                                        if (err) {
                                            return res.status(500).json({
                                                title: 'An error occurred',
                                                error: err
                                            });
                                        } else {
                                            Availabilities.updateMany({ '_id': offerDetails.offerId.Availability_id._id }, { $set: { Hired: true } }, function(err, data) {
                                                if (err) {
                                                    return res.status(500).json({
                                                        title: 'An error occurred',
                                                        error: err
                                                    });
                                                } else {
                                                    res.status(200).send({ message: "Congrats your have Choosen to work with " + offerDetails.offerId.Employer_id.Firstname + " Report to work on " + offerDate });
                                                }
                                            })

                                        }
                                    });
                            })
                            .catch(err => {
                                console.log(err)
                                return res.status(500).json({
                                    title: 'An error occurred',
                                    error: err
                                });
                            })
                    }
                })
            }
        })
})

router.get('/nrtw/:id', function(req, res) {
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
                console.log(err);
                return res.status(500).json({ title: 'An error occurred', error: err });
            }
            if (!offerDetails) {
                return res.status(401).json({
                    title: 'Offer No longer Available or expired,  check the status of your job offers below',
                    error: { message: 'Offer Expired' }
                });
            } else {
                var token = new OffersToken();
                token.offerId = offerDetails.offerId._id;
                token.token = crypto.randomBytes(16).toString('hex')
                token.save(function(err, result) {
                    if (err) {
                        if (err) {
                            console.log(err)
                            return res.status(500).json({
                                title: 'An error occurred',
                                error: err
                            });
                        }
                    } else {

                        var offerDate = offerDetails.offerId.Availability_id.Date.toISOString().slice(0, 10);
                        var mailOptions = {
                            from: 'ashokona@gmail.com',
                            to: offerDetails.offerId.Employer_id.Email_Address,
                            subject: offerDetails.offerId.Employer_id.Firstname + ', Has Declined Your job offer',
                            html: '<b>Hi, <strong>' + offerDetails.offerId.Employer_id.Firstname + '</strong></b><br>' +
                                ' <p>' + '<strong>' + offerDetails.offerId.JS_id.Firstname + ' ' + offerDetails.offerId.JS_id.Lastname + '</strong>' + ' has declined your job offer for position ' + offerDetails.offerId.JS_id.Position + ' on ' + offerDate + '</p>' +
                                ' <p>' + ' There are few other jobseekers ready to work, Login to DEntal Assistant and choose any one from them' + '</p>' +
                                ' <p>Administrator</p>' +
                                ' <p>At Employment</p>'
                        };


                        MailService(mailOptions)
                            .then(result => {
                                offerDetails.remove();
                                Offers.update({ _id: offerDetails.offerId._id }, { Status: 'DECLINED', Ready_to_work: 'DECLINED' },
                                    function(err, data) {
                                        if (err) {
                                            console.log("update error")
                                            return res.status(500).json({
                                                title: 'An error occurred',
                                                error: err
                                            });
                                        } else {
                                            res.status(200).send({ message: "You have choose  not to work with" + offerDetails.offerId.Employer_id.Firstname + ' ' + offerDetails.offerId.Employer_id.Lastname + " for the position " + offerDetails.offerId.JS_id.Position + " on " + offerDate + ". There are more job offer waiting for you!" });
                                        }
                                    });

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
        })
})


module.exports = router;