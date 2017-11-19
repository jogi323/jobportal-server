var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Availabilities = mongoose.model('Availabilities');
var User = mongoose.model('User');
var Payments = mongoose.model('Payments');
var Offers = mongoose.model('Offers');
var VerifyToken = mongoose.model('VerifyToken');
var auth = require('./auth');
var crypto = require('crypto');

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
                                console.log(offerList.length);
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
                                offers.save(function(err, offer) {
                                    if (err) { return res.status(500).json({ title: 'Unable To create offer', error: err }); } else {
                                        // user.Offers_id.push(result);

                                        offerList.splice(0, 1);
                                        console.log(js.Phone1)
                                        client.messages.create({
                                            to: "+91" + js.Phone1,
                                            from: "+16364892045",
                                            body: "Hi, " + user.Firstname + " " + user.Lastname + "has a job offer for you, send  " + "'" + "ACCEPT" + " " + messageId + "'" + "to accept Offer" + " to decline send " + "'" + "DECLINE" + " " + messageId + "'" + " to '+16364892045' ",
                                        }, function(err, message) {
                                            if (err) {
                                                return res.status(500).json({ title: 'Unable To Send Request', error: err });
                                            }
                                            if (message) {

                                            }
                                        });
                                        if (offerList.length === 0) {
                                            // user.save();
                                            res.status(200).json({
                                                message: 'Offer Created and Request was sent',
                                            });
                                        }

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
    console.log(req.body);

    jsRespone = req.body.Body.split(" ")[0];
    jsMessageId = req.body.Body.split(" ")[1];
    console.log(jsRespone)
    console.log(jsMessageId)
    console.log("----strated---")
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

                    var twilio = require('twilio');
                    var twiml = new twilio.TwimlResponse();
                    twiml.message('OOPS!! Something went wrong, please contact our administrator');
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    res.end(twiml.toString());
                } else if (result.Status === 'PENDING') {
                    result.Status = 'ACCEPTED';
                    result.Ready_to_work = 'PENDING';
                    result.save(function(err) {
                        if (err) {

                            var twilio = require('twilio');
                            var twiml = new twilio.TwimlResponse();
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

                                    var twilio = require('twilio');
                                    var twiml = new twilio.TwimlResponse();
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
        console.log("declinecalled")
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

        var twilio = require('twilio');
        var twiml = new twilio.TwimlResponse();
        twiml.message('Incorrect code sent Pleasse send the correct code with ACCEPT or REJECT message');
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml.toString());
    }

});


module.exports = router;