var mongoose = require('mongoose');
var Availabilities = mongoose.model('Availabilities');
var User = mongoose.model('User');
var Payments = mongoose.model('Payments');
var Offers = mongoose.model('Offers');
var VerifyToken = mongoose.model('VerifyToken');
var OffersToken = mongoose.model('OffersToken');
// var auth = require('./auth');
var crypto = require('crypto');
var MailService = require('../config/transport');
var TwilioService = require('../config/twilio');
var serverUrl = require('../config').serverUrl;



exports.accept = function(offerDetails, res) {
    var token = new OffersToken();
    token.offerId = offerDetails.offerId._id;
    token.token = crypto.randomBytes(16).toString('hex');
    token.smsToken = crypto.randomBytes(2).toString('hex');
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
            var jsEmail = offerDetails.offerId.JS_id.Email_Address;
            var jsFirstName = offerDetails.offerId.JS_id.Firstname;
            var jsLastName = offerDetails.offerId.JS_id.Lastname;
            var jsPhone = offerDetails.offerId.JS_id.Phone1;
            var empEmail = offerDetails.offerId.Employer_id.Email_Address;
            var empFirstName = offerDetails.offerId.Employer_id.Firstname;
            var empLastName = offerDetails.offerId.Employer_id.Lastname;
            var empPhone = offerDetails.offerId.Employer_id.Contact_Phone_Nr;
            var jsPosition = offerDetails.offerId.JS_id.Position;

            var mailOptions = {
                from: 'noreply@anydayemployment.com',
                to: empEmail,
                subject: 'Congrats! ' + jsFirstName + ' Has Accepted Your job offer',
                // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
                html: '<b>Hi <strong>' + empFirstName + ',</strong></b><br>' +
                    ' <p>' + '<strong>' + jsFirstName + ' ' + jsLastName + '</strong>' + ' has accepted your job offer for position ' + '<b>' + jsPosition + '</b>' + ' on ' + offerDate + '</p>' +
                    ' <p>' + ' To choose this job seeker and Invite him to work click the link below' + '</p>' +
                    ' <a href="' + acceptJSLink + '">Confirm Jobseeker</a>' +
                    ' <p>' + ' if you prefer to choose other jobseeker cancel the current job seekers offer by clicking the below link' + '</p>' +
                    ' <a href="' + rejectJSLink + '">Reject Jobseeker</a>' +
                    ' <p>Administrator</p>' +
                    ' <p>At Any Day Employment</p>'
            };

            MailService(mailOptions)
                .then(result => {
                    Offers.update({ _id: offerDetails.offerId._id }, { Status: 'ACCEPTED' },
                        function(err, data) {
                            if (err) {
                                console.log("update error")
                                return res.status(500).json({
                                    title: 'An error occurred',
                                    error: err
                                });
                            } else {
                                offerDetails.remove();
                                var data = {
                                    to: "+91" + empPhone,
                                    body: "Hi " + empFirstName + ", " + jsFirstName + " " + jsLastName + " has accepted your offer for position " + jsPosition + " on " + offerDate + " to select this jobseeker send " + "'SELECT " + token.smsToken + "'" + ", to reject send " + "'REJECT " + token.smsToken + "'" + " to +18448223442"
                                }
                                TwilioService(data)
                                    .then(result => {
                                        res.status(200).send({ message: "Congrats your have accepted the job offer by, " + empFirstName + ' ' + empLastName + " for the position " + jsPosition + " on " + offerDate + " Request was sent to employer, please wait for the response" });
                                    })
                                    .catch(err => {
                                        res.status(200).send({ message: "Congrats your have accepted the job offer by, " + empFirstName + ' ' + empLastName + " for the position " + jsPosition + " on " + offerDate + " Request was sent to employer, please wait for the response" });
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

exports.reject = function(offerDetails, res) {
    var jsEmail = offerDetails.offerId.JS_id.Email_Address;
    var jsFirstName = offerDetails.offerId.JS_id.Firstname;
    var jsLastName = offerDetails.offerId.JS_id.Lastname;
    var jsPhone = offerDetails.offerId.JS_id.Phone1;
    var empEmail = offerDetails.offerId.Employer_id.Email_Address;
    var empFirstName = offerDetails.offerId.Employer_id.Firstname;
    var empLastName = offerDetails.offerId.Employer_id.Lastname;
    var empPhone = offerDetails.offerId.Employer_id.Contact_Phone_Nr;
    var jsPosition = offerDetails.offerId.JS_id.Position;
    var offerDate = offerDetails.offerId.Availability_id.Date.toISOString().slice(0, 10);

    var mailOptions = {
        from: 'noreply@anydayemployment.com',
        to: empEmail,
        subject: "Hi ," + jsFirstName + ' Has Declined Your job offer',
        // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
        html: '<b>Hi <strong>' + empFirstName + ',</strong></b><br>' +
            ' <p>' + '<strong>' + jsFirstName + ' ' + jsLastName + '</strong>' + ' has declined your job offer for position ' + '<b>' + jsPosition + '</b>' + ' on ' + offerDate + '</p>' +
            ' <p>' + 'Do not worry! There are few other jobseekers ready to work, Search for other jobseekers at Any Day Employment' + '</p>' +
            ' <p>Administrator</p>' +
            ' <p>At Any Day Employment</p>'
    };

    MailService(mailOptions)
        .then(result => {

            Offers.update({ _id: offerDetails.offerId._id }, { Status: 'DECLINED' },
                function(err, data) {
                    if (err) {
                        console.log("update error")
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    } else {
                        offerDetails.remove();
                        var data = {
                            to: "+91" + empPhone,
                            body: "Hi " + empFirstName + ", " + jsFirstName + " " + jsLastName + " has declined your offer for position " + jsPosition + " on " + offerDate + ". There are more Job Seeker ready to work, To select any login to Any Day Employment"
                        }
                        TwilioService(data)
                            .then(result => {
                                res.status(200).send({ message: "You have rejected job offer by " + empFirstName + ' ' + empLastName + ", for the position " + jsPosition + " on " + offerDate + ". You can check the status of your job offers at Any Day Employment" });

                            })
                            .catch(err => {
                                res.status(200).send({ message: "You have rejected job offer by " + empFirstName + ' ' + empLastName + ", for the position " + jsPosition + " on " + offerDate + ". You can check the status of your job offers at Any Day Employment" });
                            })
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

exports.acceptjs = function(offerDetails, res) {
    var token = new OffersToken();
    token.offerId = offerDetails.offerId._id;
    token.token = crypto.randomBytes(16).toString('hex');
    token.smsToken = crypto.randomBytes(2).toString('hex');
    var jsEmail = offerDetails.offerId.JS_id.Email_Address;
    var jsFirstName = offerDetails.offerId.JS_id.Firstname;
    var jsLastName = offerDetails.offerId.JS_id.Lastname;
    var jsPhone = offerDetails.offerId.JS_id.Phone1;
    var empEmail = offerDetails.offerId.Employer_id.Email_Address;
    var empFirstName = offerDetails.offerId.Employer_id.Firstname;
    var empLastName = offerDetails.offerId.Employer_id.Lastname;
    var empPhone = offerDetails.offerId.Employer_id.Contact_Phone_Nr;
    var jsPosition = offerDetails.offerId.JS_id.Position;
    var offerDate = offerDetails.offerId.Availability_id.Date.toISOString().slice(0, 10);

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

            var mailOptions = {
                from: 'noreply@anydayemployment.com',
                to: jsEmail,
                subject: "Hi, " + empFirstName + ' is expecting you to Report to work',
                // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
                html: '<b>Hi <strong>' + jsFirstName + ',</strong></b><br>' +
                    ' <p>' + '<strong>' + empFirstName + ' ' + empLastName + '</strong>' + ' has accepted your job offer for position ' + jsPosition + ' on ' + offerDate + '</p>' +
                    ' <p>' + ' To confirm and Report to Work, follow the link below' + '</p>' +
                    ' <a href="' + jobseekerRtw + '">Reporting To work</a>' +
                    ' <p>' + ' We dont recommend this, but if you choose not to Report to work, Click the link below' + '</p>' +
                    ' <a href="' + declineNrtwLink + '">Not Reporting to Work</a>' +
                    ' <p>Administrator</p>' +
                    ' <p>At Any Day Employment</p>'
            };

            MailService(mailOptions)
                .then(result => {

                    Offers.update({ _id: offerDetails.offerId._id }, { Status: 'NRTW' },
                        function(err, data) {
                            if (err) {
                                console.log("update error")
                                return res.status(500).json({
                                    title: 'An error occurred',
                                    error: err
                                });
                            } else {
                                offerDetails.remove();
                                var data = {
                                    to: "+91" + jsPhone,
                                    body: "Hi " + jsFirstName + ", " + empFirstName + " " + empLastName + " is expecting you to Report to Work for " + jsPosition + " on " + offerDate + " to Report to Work send " + "'RTW " + token.smsToken + "'" + ", to Decline(which we stronly dont recommend) send " + "'NRTW " + token.smsToken + "'" + " to +18448223442"
                                }
                                TwilioService(data)
                                    .then(result => {
                                        res.status(200).send({ message: "You have selected jobseeker, " + jsFirstName + ' ' + jsLastName + " for position " + jsPosition + " on " + offerDate + ". Any time to check the Status of your offred jobs go to Any Day Employment" });

                                    })
                                    .catch(err => {
                                        res.status(200).send({ message: "You have selected jobseeker, " + jsFirstName + ' ' + jsLastName + " for position " + jsPosition + " on " + offerDate + ". Any time to check the Status of your offred jobs go to Any Day Employment" });

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

exports.rejectjs = function(offerDetails, res) {

    var jsEmail = offerDetails.offerId.JS_id.Email_Address;
    var jsFirstName = offerDetails.offerId.JS_id.Firstname;
    var jsLastName = offerDetails.offerId.JS_id.Lastname;
    var jsPhone = offerDetails.offerId.JS_id.Phone1;
    var empEmail = offerDetails.offerId.Employer_id.Email_Address;
    var empFirstName = offerDetails.offerId.Employer_id.Firstname;
    var empLastName = offerDetails.offerId.Employer_id.Lastname;
    var empPhone = offerDetails.offerId.Employer_id.Contact_Phone_Nr;
    var jsPosition = offerDetails.offerId.JS_id.Position;
    var offerDate = offerDetails.offerId.Availability_id.Date.toISOString().slice(0, 10);

    var mailOptions = {
        from: 'noreply@anydayemployment.com',
        to: jsEmail,
        subject: "Hi, " + empFirstName + ' Has Declined Your job offer',
        // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
        html: '<b>Hi <strong>' + jsFirstName + ',</strong></b><br>' +
            ' <p>' + '<strong>' + empLastName + ' ' + empLastName + '</strong>' + ' has declined your job offer for position ' + offerDetails.offerId.JS_id.Position + ' on ' + offerDate + '</p>' +
            ' <p>' + 'There are more job offers waiting for you, Anyt time to check the status of your job offers Login to Any Day Employment' + '</p>' +
            ' <p>Administrator</p>' +
            ' <p>At Any Day Employment</p>'
    };

    MailService(mailOptions)
        .then(result => {
            Offers.update({ _id: offerDetails.offerId._id }, { Status: 'DECLINED' },
                function(err, data) {
                    if (err) {
                        console.log("update error")
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    } else {
                        offerDetails.remove();
                        var data = {
                            to: "+91" + jsPhone,
                            body: "Hi " + jsFirstName + ", " + empFirstName + " " + empLastName + " has declined your job offer for " + jsPosition + " on " + offerDate + ". Any time to check the status of you job offers login to Any Day Employment"
                        }
                        TwilioService(data)
                            .then(result => {
                                res.status(200).send({ message: "You have rejected job seeker " + jsFirstName + ' ' + jsFirstName + " for the position " + jsPosition + " on " + offerDate + ". There are more job seekers to work!" });

                            })
                            .catch(err => {
                                res.status(200).send({ message: "You have rejected job seeker " + jsFirstName + ' ' + jsLastName + " for the position " + jsPosition + " on " + offerDate + ". There are more job seekers to work!" });

                            })

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

exports.rtw = function(offerDetails, res) {
    var token = new OffersToken();
    token.offerId = offerDetails.offerId._id;
    token.token = crypto.randomBytes(16).toString('hex');
    token.smsToken = crypto.randomBytes(2).toString('hex');
    var jsEmail = offerDetails.offerId.JS_id.Email_Address;
    var jsFirstName = offerDetails.offerId.JS_id.Firstname;
    var jsLastName = offerDetails.offerId.JS_id.Lastname;
    var jsPhone = offerDetails.offerId.JS_id.Phone1;
    var empEmail = offerDetails.offerId.Employer_id.Email_Address;
    var empFirstName = offerDetails.offerId.Employer_id.Firstname;
    var empLastName = offerDetails.offerId.Employer_id.Lastname;
    var empPhone = offerDetails.offerId.Employer_id.Contact_Phone_Nr;
    var jsPosition = offerDetails.offerId.JS_id.Position;
    var offerDate = offerDetails.offerId.Availability_id.Date.toISOString().slice(0, 10);

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


            var mailOptions = {
                from: 'noreply@anydayemployment.com',
                to: empEmail,
                subject: jsFirstName + ', is Ready to Work',
                // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
                html: '<b>Hi <strong>' + empFirstName + ',</strong></b><br>' +
                    ' <p>' + '<strong>' + jsFirstName + ' ' + jsLastName + '</strong>' + ' is ready to work for your job offer for position ' + offerDetails.offerId.JS_id.Position + ' on ' + offerDate + '</p>' +
                    ' <p>Administrator</p>' +
                    ' <p>At Any Day Employment</p>'
            };

            MailService(mailOptions)
                .then(result => {
                    Offers.update({ _id: offerDetails.offerId._id }, { Status: 'HIRED' },
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
                                        offerDetails.remove();
                                        var data = {
                                            to: "+91" + empPhone,
                                            body: "Hi " + empFirstName + ", " + jsFirstName + " " + jsLastName + " is Ready to Work for position " + jsPosition + " on " + offerDate + ". Any time to check the status of your job offer, login to Any Day Employment"
                                        }
                                        TwilioService(data)
                                            .then(result => {
                                                res.status(200).send({ message: "Congrats your have Choosen to work with " + empFirstName + " " + empLastName + " for position " + jsPosition + " Report to work on " + offerDate });

                                            })
                                            .catch(err => {
                                                res.status(200).send({ message: "Congrats your have Choosen to work with " + empFirstName + " " + empLastName + " for position " + jsPosition + " Report to work on " + offerDate });

                                            })

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

exports.nrtw = function(offerDetails, res) {
    var jsEmail = offerDetails.offerId.JS_id.Email_Address;
    var jsFirstName = offerDetails.offerId.JS_id.Firstname;
    var jsLastName = offerDetails.offerId.JS_id.Lastname;
    var jsPhone = offerDetails.offerId.JS_id.Phone1;
    var empEmail = offerDetails.offerId.Employer_id.Email_Address;
    var empFirstName = offerDetails.offerId.Employer_id.Firstname;
    var empLastName = offerDetails.offerId.Employer_id.Lastname;
    var empPhone = offerDetails.offerId.Employer_id.Contact_Phone_Nr;
    var jsPosition = offerDetails.offerId.JS_id.Position;
    var offerDate = offerDetails.offerId.Availability_id.Date.toISOString().slice(0, 10);

    var mailOptions = {
        from: 'noreply@anydayemployment.com',
        to: empEmail,
        subject: jsFirstName + ', Has Declined Your job offer',
        html: '<b>Hi <strong>' + empFirstName + ',</strong></b><br>' +
            ' <p>' + '<strong>' + jsFirstName + ' ' + jsLastName + '</strong>' + ' has declined your job offer for position ' + jsPosition + ' on ' + offerDate + '</p>' +
            ' <p>' + ' There are few other jobseekers ready to work, to search the available job seekers go to Any Day Employment' + '</p>' +
            ' <p>Administrator</p>' +
            ' <p>At Any Day Employment</p>'
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
                        offerDetails.remove();
                        var data = {
                            to: "+91" + empPhone,
                            body: "Hi " + empFirstName + ", " + jsFirstName + " " + jsLastName + " has declined your job offer for " + jsPosition + " on " + offerDate + ". Any time to check the status of you job offers login to Any Day Employment"
                        }
                        TwilioService(data)
                            .then(result => {
                                res.status(200).send({ message: "You have choose  not to work with" + empFirstName + ' ' + empLastName + " for the position " + jsPosition + " on " + offerDate + ". We recommend not to Reject accepted offers!" });

                            })
                            .catch(err => {
                                res.status(200).send({ message: "You have choose  not to work with" + empFirstName + ' ' + empLastName + " for the position " + jsPosition + " on " + offerDate + ". We recommend not to Reject accepted offers!" });

                            })
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