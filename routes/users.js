var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Contactus = mongoose.model('Contactus');
var VerifyToken = mongoose.model('VerifyToken');
var crypto = require('crypto');
var auth = require('./auth');
var nodemailer = require("nodemailer");
var TwilioService = require('../config/twilio');

var MailService = require('../config/transport')
var serverUrl = require('../config').serverUrl;
var accountSid = 'ACe59061ce19c17d5d22f24f4030077216';
var authToken = 'c72ecbf92ae0157e39b97ace69aef668';

//require the Twilio module and create a REST client 
var client = require('twilio')(accountSid, authToken);
/* GET users listing. */


router.get('/auth', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (!user) {
            return res.status(401).json({
                title: 'Not Authorised',
                error: { message: 'Login Again' }
            });
        } else {
            var token = user.generateJWT();
            var user = user.toAuthJSON();
            res.status(200).json({
                token: token,
                user: user
            });
        }
    })
});

router.post('/auth', function(req, res, next) {
    User.findOne({ Email_Address: req.body.Email_Address }, function(err, user) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (!user) {
            return res.status(401).json({
                title: 'Login failed',
                error: { message: 'Invalid login credentials' }
            });
        }
        if (!user.validPassword(req.body.Password)) {
            return res.status(401).json({
                title: 'Login failed',
                error: { message: 'Invalid login credentials' }
            });
        }

        if (!user.Email_Verified) {
            var token = new VerifyToken();
            token.user = user._id;
            token.token = crypto.randomBytes(16).toString('hex')
            token.save(function(err) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }

                var confirmationLink = serverUrl + 'confirm/' + token.token;
                var mailOptions = {
                    from: 'noreply@anydayemployment.com',
                    to: user.Email_Address,
                    subject: 'Congratulations ' + user.Firstname + ', Welcome to Any Day Employment - Dental Connections',
                    // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
                    html: '<b>Welcome <strong>' + user.Firstname + '</strong>,</b><br>' +
                        ' <p>Congratulation on Signing up with Any Day Employment – Dental Connections. Your next step is to complete your profile and then you are ready to join the growing community of Dental Professionals ready to Get Help or Get Hired, Right Now, Today, AnyDay you want….</p>' +
                        ' <p>What exactly does that mean? We are a real-time portal using Text/Email messaging to allow connections between Dental Office Employers and the Immediate Staff or Specialists they need. If an employee calls in sick, has an emergency, is on vacation or away from the office for any reason, the Dental Office can login and immediately search for individuals who have indicated in their work schedule they are available to work Right Now, Today. Text/Email connections are made privately through the Communication System. As a Job Seeker, your name and contact information is kept secure until you accept the job offer from the dental office. It’s fast, simple, easy and FREE!  As an employer, it is FREE to search for available team members before posting your job offer to them in real time, Right Now, Today, AnyDay.</p>' +
                        ' <p>Click the link below to Login with your Email and Password and Complete your Profile Information. As a Job Seeker, enter your availability on the scheduling calendar with one day a week, one day a month, or AnyDay you like………..Employers are looking for you.</p>' +
                        ' <p>Login here and Complete your Profile:</p>' +
                        ' <a href="' + confirmationLink + '">click here</a>' +
                        ' <p>Thank you, now you’re on your way to Get Help or Get Hired to Work AnyDay you want.</p>' +
                        ' <p><b>The Community is adding new members everyday however the growth depends COMPLETELY on your involvement to help everyone be productive. Tell your friends, co-workers, office managers, dental specialists and dental employers about this service. Please keep your contact information updated as well as you work schedule. The Community is Building and if you do not get a job or find a team member with your initial attempts, as more offices and team members join, you will. Keep Checking as we grow.</b></p><br>' +
                        ' <p>Thank you Again and Welcome,</p>' +
                        ' <p>Administrator</p>' +
                        ' <p>Any Day Employment</p>'
                };

                MailService(mailOptions)
                    .then(result => {
                        res.status(200).json({
                            message: 'Email not yet verified, verify email sent to ' + user.Email_Address + ' to login.',
                        });
                    })
                    .catch(err => {
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    })
            });
        }
        if (!user.Status) {
            return res.status(401).json({
                title: 'User Blocked',
                error: { message: 'Contact Administrator' }
            });
        } else {
            var token = user.generateJWT();
            var user = user.toAuthJSON();
            res.status(200).json({
                message: 'Successfully logged in',
                token: token,
                user: user
            });
        }

    });
});

router.post('/save', function(req, res, next) {

    User.findOne({ Email_Address: req.body.Email_Verified }, function(err, user) {
        console.log(user)
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (user) {
            return res.status(401).json({
                title: 'This email address is already registered with us. Please use the login page to login to your account',
                error: { message: 'please login' }
            });
        } else {
            var user = new User();

            user.Firstname = req.body.Firstname;
            user.Lastname = req.body.Lastname;
            user.Referred_By = req.body.Referred_By;
            user.setPassword(req.body.Password);
            user.Email_Address = req.body.Email_Address;
            user.userType = req.body.userType;

            user.save(function(err, result) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                } else {
                    var token = new VerifyToken();
                    token.user = result._id;
                    token.token = crypto.randomBytes(16).toString('hex')
                    token.save(function(err) {
                        if (err) {
                            return res.status(500).json({
                                title: 'An error occurred',
                                error: err
                            });
                        }
                        var confirmationLink = serverUrl + 'confirm/' + token.token;
                        var mailOptions = {
                            from: 'noreply@anydayemployment.com',
                            to: result.Email_Address,
                            subject: 'Congratulations ' + result.Firstname + ', Welcome to Any Day Employment - Dental Connections',
                            // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
                            html: '<b>Welcome <strong>' + result.Firstname + '</strong>,</b><br>' +
                                ' <p>Congratulation on Signing up with Any Day Employment – Dental Connections. Your next step is to complete your profile and then you are ready to join the growing community of Dental Professionals ready to Get Help or Get Hired, Right Now, Today, AnyDay you want….</p>' +
                                ' <p>What exactly does that mean? We are a real-time portal using Text/Email messaging to allow connections between Dental Office Employers and the Immediate Staff or Specialists they need. If an employee calls in sick, has an emergency, is on vacation or away from the office for any reason, the Dental Office can login and immediately search for individuals who have indicated in their work schedule they are available to work Right Now, Today. Text/Email connections are made privately through the Communication System. As a Job Seeker, your name and contact information is kept secure until you accept the job offer from the dental office. It’s fast, simple, easy and FREE!  As an employer, it is FREE to search for available team members before posting your job offer to them in real time, Right Now, Today, AnyDay.</p>' +
                                ' <p>Click the link below to Login with your Email and Password and Complete your Profile Information. As a Job Seeker, enter your availability on the scheduling calendar with one day a week, one day a month, or AnyDay you like………..Employers are looking for you.</p>' +
                                ' <p>Login here and Complete your Profile:</p>' +
                                ' <a href="' + confirmationLink + '">click here</a>' +
                                ' <p>Thank you, now you’re on your way to Get Help or Get Hired to Work AnyDay you want.</p>' +
                                ' <p><b>The Community is adding new members everyday however the growth depends COMPLETELY on your involvement to help everyone be productive. Tell your friends, co-workers, office managers, dental specialists and dental employers about this service. Please keep your contact information updated as well as you work schedule. The Community is Building and if you do not get a job or find a team member with your initial attempts, as more offices and team members join, you will. Keep Checking as we grow.</b></p><br>' +
                                ' <p>Thank you Again and Welcome,</p>' +
                                ' <p>Administrator</p>' +
                                ' <p>Any Day Employment</p>'
                        };

                        MailService(mailOptions)
                            .then(data => {
                                res.status(200).json({
                                    message: 'A verification email has been sent to ' + result.Email_Address + '.',
                                });
                            })
                            .catch(err => {
                                return res.status(500).json({
                                    title: 'An error occurred',
                                    error: err
                                });
                            })

                    });
                }
            });
        }
    })

});

router.get('/confirmation/:id', function(req, res, next) {
    VerifyToken.findOne({ token: req.params.id }, function(err, token) {
        if (!token) return res.status(400).send({ type: 'not-verified', msg: 'We were unable to find a valid token. Your token my have expired.' });

        // If we found a token, find a matching user
        User.findOne({ _id: token.user }, function(err, user) {
            if (!user) return res.status(400).send({ msg: 'We were unable to find a user for this token.' });
            if (user.Email_Verified) return res.status(400).send({ type: 'already-verified', msg: 'This user has already been verified.' });

            // Verify and save the user
            user.Email_Verified = true;
            user.Status = true;
            //user.setPassword(req.body.Password);
            user.save(function(err) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }
                res.status(200).send({ message: "Account has been verified. Please login." });
            });
        });
    });
});

router.get('/resendconfirmation/:id', auth.required, function(req, res, next) {
    User.findOne({ Email_Address: req.params.id }, function(err, user) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (!user) {
            return res.status(401).json({
                title: 'No account found with the associated email',
                error: { message: 'please register' }
            });
        }
        if (user.Email_Verified) {
            return res.status(401).json({
                title: user.Email_Address + 'is already verified, please login',
                error: { message: 'please Login' }
            });
        } else {
            var token = new VerifyToken();
            token.user = user._id;
            token.token = crypto.randomBytes(16).toString('hex')
            token.save(function(err) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }

                var confirmationLink = serverUrl + token.token;
                var mailOptions = {
                    from: 'noreply@anydayemployment.com',
                    to: user.Email_Address,
                    subject: 'Congratulations ' + user.Firstname + ', Welcome to Employment - Dental Connections',
                    // text: 'eaders.host + '\/user' + '\/confirmation\/' + token.token + '.\n'
                    html: '<b>Welcome <strong>' + user.Firstname + '</strong>,</b><br>' +
                        ' <p>Congratulation on Signing up with Employment – Dental Connections. Your next step is to complete your profile and then you are ready to join the growing community of Dental Professionals ready to Get Help or Get Hired, Right Now, Today, AnyDay you want….</p>' +
                        ' <p>What exactly does that mean? We are a real-time portal using Text/Email messaging to allow connections between Dental Office Employers and the Immediate Staff or Specialists they need. If an employee calls in sick, has an emergency, is on vacation or away from the office for any reason, the Dental Office can login and immediately search for individuals who have indicated in their work schedule they are available to work Right Now, Today. Text/Email connections are made privately through the Communication System. As a Job Seeker, your name and contact information is kept secure until you accept the job offer from the dental office. It’s fast, simple, easy and FREE!  As an employer, it is FREE to search for available team members before posting your job offer to them in real time, Right Now, Today, AnyDay.</p>' +
                        ' <p>Click the link below to Login with your Email and Password and Complete your Profile Information. As a Job Seeker, enter your availability on the scheduling calendar with one day a week, one day a month, or AnyDay you like………..Employers are looking for you.</p>' +
                        ' <p>Login here and Complete your Profile:</p>' +
                        ' <a href="' + confirmationLink + '">click here</a>' +
                        ' <p>Thank you, now you’re on your way to Get Help or Get Hired to Work AnyDay you want.</p>' +
                        ' <p><b>The Community is adding new members everyday however the growth depends COMPLETELY on your involvement to help everyone be productive. Tell your friends, co-workers, office managers, dental specialists and dental employers about this service. Please keep your contact information updated as well as you work schedule. The Community is Building and if you do not get a job or find a team member with your initial attempts, as more offices and team members join, you will. Keep Checking as we grow.</b></p><br>' +
                        ' <p>Thank you Again and Welcome,</p>' +
                        ' <p>Administrator</p>' +
                        ' <p>Any Day Employment</p>'
                };

                MailService(mailOptions)
                    .then(result => {
                        res.status(200).json({
                            message: 'A verification email has been sent to ' + user.Email_Address + '.',
                        });
                    })
                    .catch(err => {
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    })
            });
        }

    })
});

router.get('/getProfile/:id', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (!user) {
            return res.status(401).json({
                title: 'Not Authorised',
                error: { message: 'Login Again' }
            });
        } else {
            User.findOne({ Email_Address: req.params.id })
                .populate('Position')
                .exec(function(err, user) {
                    if (err) {
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    } else {
                        res.status(200).json({ data: user })
                    }
                });
        }

    })
});

router.get('/getalldetails/:id', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (!user) {
            return res.status(401).json({
                title: 'Not Authorised',
                error: { message: 'Login Again' }
            });
        } else {
            User.findById(req.params.id)
                .populate('Position', 'Position_Name')
                .populate('Offers_id')
                .populate({
                    path: 'Offers_id',
                    populate: {
                        path: 'Availability_id',
                        model: 'Availabilities',
                        select: ['Date'],
                    }
                })
                .populate('Payments_id')
                .exec(function(err, user) {
                    if (err) {
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    } else {
                        res.status(200).json({ data: user })
                    }
                });
        }

    })
});

router.put('/changepassword', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (!user) {
            return res.status(401).json({
                title: 'Not Authorised',
                error: { message: 'Login Again' }
            });
        }
        if (!user.validPassword(req.body.oldPassword)) {
            return res.status(401).json({
                title: 'Incorrect old password',
                error: { message: 'Try again' }
            });
        } else {
            user.setPassword(req.body.newPassword);
            user.save(function(err) {
                if (err) { return res.status(500).json({ title: 'Password not changed sucessfully', error: err }); }
                res.status(200).json({ message: 'Password updated sucessfully' });
            });
        }
    })
});

router.put('/update/personal', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (!user) {
            return res.status(401).json({
                title: 'Not Authorised',
                error: { message: 'Login Again' }
            });
        } else {
            if (typeof req.body.Firstname !== 'undefined') {
                user.Firstname = req.body.Firstname;
            }
            if (typeof req.body.Lastname !== 'undefined') {
                user.Lastname = req.body.Lastname;
            }
            if (typeof req.body.Address_street !== 'undefined') {
                user.Address_street = req.body.Address_street;
            }
            if (typeof req.body.Address_Unit !== 'undefined') {
                user.Address_Unit = req.body.Address_Unit;
            }
            if (typeof req.body.City !== 'undefined') {
                user.City = req.body.City;
            }
            if (typeof req.body.State !== 'undefined') {
                user.State = req.body.State;
            }
            if (typeof req.body.Zip_Code !== 'undefined') {
                user.Zip_Code = req.body.Zip_Code;
            }
            if (typeof req.body.Phone1 !== 'undefined') {
                user.Phone1 = req.body.Phone1;
            }
            if (typeof req.body.Phone2 !== 'undefined') {
                user.Phone2 = req.body.Phone2;
            }
            if (typeof req.body.image !== 'undefined') {
                user.image = req.body.image;
            }
            if (typeof req.body.locationLat !== 'undefined') {
                user.locationLat = req.body.locationLat;
            }
            if (typeof req.body.locationLng !== 'undefined') {
                user.locationLng = req.body.locationLng;
            }
            user.personalInfo = true;
            user.save(function(err) {
                if (err) { return res.status(500).json({ title: 'Personal Information Not Updated', error: err }); }
                res.status(200).json({ message: 'Personal information updated sucessfully' });
            });
        }

    })
});

router.put('/update/work', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (!user) {
            return res.status(401).json({
                title: 'Not Authorised',
                error: { message: 'Login Again' }
            });
        } else {
            if (typeof req.body.PositionId !== 'undefined') {
                user.Position = req.body.PositionId;
            }
            if (typeof req.body.Experience !== 'undefined') {
                user.Experience = req.body.Experience;
            }
            if (typeof req.body.Hourly_Pay !== 'undefined') {
                user.Hourly_Pay = req.body.Hourly_Pay;
            }
            if (typeof req.body.Practice_Name !== 'undefined') {
                user.Practice_Name = req.body.Practice_Name;
            }
            if (typeof req.body.image !== 'undefined') {
                user.image = req.body.image;
            }
            if (typeof req.body.Speciality !== 'undefined') {
                user.Speciality = req.body.Speciality;
            }
            if (typeof req.body.Practice_Phone !== 'undefined') {
                user.Practice_Phone = req.body.Practice_Phone;
            }
            if (typeof req.body.Nr_of_Operations !== 'undefined') {
                user.Nr_of_Operations = req.body.Nr_of_Operations;
            }
            if (typeof req.body.Nr_of_Staff !== 'undefined') {
                user.Nr_of_Staff = req.body.Nr_of_Staff;
            }
            if (typeof req.body.Travel_Distance !== 'undefined') {
                user.Travel_Distance = req.body.Travel_Distance;
            }
            if (typeof req.body.Languages !== 'undefined') {
                user.Languages = req.body.Languages;
            }
            if (typeof req.body.Dental_School !== 'undefined') {
                user.Dental_School = req.body.Dental_School;
            }
            if (typeof req.body.Year_Graduated !== 'undefined') {
                user.Year_Graduated = req.body.Year_Graduated;
            }
            if (typeof req.body.License_Nr !== 'undefined') {
                user.License_Nr = req.body.License_Nr;
            }
            if (typeof req.body.Years_in_Practice !== 'undefined') {
                user.Years_in_Practice = req.body.Years_in_Practice;
            }
            if (typeof req.body.Contact_Person !== 'undefined') {
                user.Contact_Person = req.body.Contact_Person;
            }
            if (typeof req.body.Contact_Phone_Nr !== 'undefined') {
                user.Contact_Phone_Nr = req.body.Contact_Phone_Nr;
            }
            user.workInfo = true;
            user.save(function(err) {
                if (err) { return res.status(500).json({ title: 'Work Information Not Updaed', error: err }); }
                res.status(200).json({ message: 'Work information updated sucessfully' });
            });
        }

    })
});

router.post('/resetpasswordlink', function(req, res, next) {

    User.findOne({ Email_Address: req.body.Email_Address }, function(err, result) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (!result) {
            return res.status(500).json({
                title: 'No user Found with the ' + req.body.Email_Address + ' Email',
            });
        } else {
            var token = new VerifyToken();
            token.user = result._id;
            token.token = crypto.randomBytes(16).toString('hex')
            token.save(function(err) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }

                var resetpasswordLink = serverUrl + 'forgotpassword/' + token.token;
                var mailOptions = {
                    from: 'noreply@anydayemployment.com',
                    to: result.Email_Address,
                    subject: 'Reset Password Link',
                    html: '<b>Hello <strong>' + result.Firstname + '</strong>,</b><br>' +
                        ' <p>Forgot your paswword, Were are always here  to help. Please click on below link to get a new password:</p>' +
                        ' <a href="' + resetpasswordLink + '">click here</a>' +
                        ' <p>Thank you,</p>' +
                        ' <p>Administrator</p>' +
                        ' <p>Any Day Employment</p>'
                };
                MailService(mailOptions)
                    .then(response => {
                        res.status(200).json({
                            message: 'A rest link has been sent to ' + result.Email_Address + '.',
                        });
                    })
                    .catch(err => {
                        console.log(err)
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    })
            });
        }
    });
});

router.post('/resetpassword', function(req, res, next) {

    // Find a matching token
    VerifyToken.findOne({ token: req.body.id }, function(err, token) {
        if (!token) return res.status(400).send({ type: 'not-verified', msg: 'We were unable to find a valid token. Your token my have expired.' });

        // If we found a token, find a matching user
        User.findOne({ _id: token.user }, function(err, user) {
            if (!user) return res.status(400).send({ msg: 'We were unable to find a user for this token.' });
            // if (user.Email_Verified) return res.status(400).send({ type: 'already-verified', msg: 'This user has already been verified.' });

            // Verify and save the user

            user.setPassword(req.body.newPassword);
            user.save(function(err) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }
                res.status(200).send({ message: "Your password has been changed successfully" });
            });
        });
    });
});

router.post('/contactus', function(req, res, next) {
    contactus = new Contactus()

    contactus.Firstname = req.body.FirstName;
    contactus.Lastname = req.body.Lastname;
    contactus.Email_Address = req.body.Email_Address;
    contactus.Comments = req.body.Comments;
    contactus.Date_Submitted = req.body.Date_Submitted;

    contactus.save(function(err) {
        if (err) { return res.status(500).json({ title: 'unable to save details', error: err }) }
        res.status(200).send({ message: "We received your details, will soon get back to you" });
    });
});

router.post('/sendOtp/:id', auth.required, function(req, res) {
    User.findOne({ Email_Address: req.params.id }, function(err, user) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (!user) {
            return res.status(401).json({
                title: 'No account found with the associated email',
                error: { message: 'please register' }
            });
        } else {
            var otp = Math.floor(1000 + Math.random() * 9000);

            var data = {
                to: req.body.number,
                body: "Hi, " + user.Firstname + " " + user.Lastname + "," + "your OTP to verify mobile number is :" + otp,
            }
            TwilioService(data)
                .then(result => {
                    User.update({ Email_Address: req.params.id }, { $set: { otp: otp } }, function(err, data) {
                        if (err) {
                            return res.status(500).json({
                                title: 'An error occurred',
                                error: err
                            })
                        } else {
                            return res.status(200).json({
                                message: "OTP has sent to your mobile"
                            })
                        }
                    });
                })
                .catch(err => {
                    return res.status(500).json({ title: 'Unable To Send Request', error: err });

                })
        }

    });
});

router.post('/verifyOtp/:id', auth.required, function(req, res) {
    User.find({ Email_Address: req.params.id }, function(err, user) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (!user) {
            return res.status(401).json({
                title: 'No account found with the associated email',
                error: { message: 'please register' }
            });
        } else {
            User.find({ otp: req.body.otp }, function(err, user) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }
                if (user.length === 0) {
                    return res.status(401).json({
                        title: 'Failed',
                        error: { message: 'Invalid OTP' }
                    });
                } else {
                    user.otpVerified = true;

                    user.save(function(err) {
                        if (err) {
                            return res.status(500).json({
                                title: 'An error occurred',
                                error: err
                            });
                        }
                        return res.status(200).json({
                            message: 'Mobile number verified successfully'
                        });
                    });

                }
            });
        }
    })
});

router.get('/getall', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (!user) {
            return res.status(401).json({
                title: 'Not Authorised',
                error: { message: 'Login Again' }
            });
        } else {
            User.find({})
                .populate('Position', 'Position_Name')
                .exec(function(err, user) {
                    if (err) {
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    } else {
                        res.status(200).json({ data: user })
                    }
                });
        }

    })
});

router.put('/changestatus/:id', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        }
        if (!user) {
            return res.status(401).json({
                title: 'Not Authorised',
                error: { message: 'Login Again' }
            });
        } else {
            User.findById(req.params.id, function(err, result) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }
                if (!result) {
                    return res.status(401).json({
                        title: 'User Not found',
                        error: { message: 'Check Back' }
                    });
                } else if (result.Status === false) {
                    result.Status = true;
                    result.save(function(err) {
                        if (err) {
                            return res.status(500).json({
                                title: 'An error occurred',
                                error: err
                            });
                        }
                        res.status(200).send({ message: "User had been Activated Sucessfully" });
                    });
                } else if (result.Status === true) {
                    result.Status = false;
                    result.save(function(err) {
                        if (err) {
                            return res.status(500).json({
                                title: 'An error occurred',
                                error: err
                            });
                        }
                        res.status(200).send({ message: "User had been Deactivated Sucessfully" });
                    });
                }
            });
        }

    })
});

module.exports = router;