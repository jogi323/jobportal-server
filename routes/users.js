var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = mongoose.model('User');
var VerifyToken = mongoose.model('VerifyToken');
var crypto = require('crypto');
var auth = require('./auth');
var nodemailer = require("nodemailer");

/* GET users listing. */
router.get('/auth', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) {
            console.log(err);
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
            console.log(err);
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
                var transporter = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'ashokona@gmail.com',
                        pass: 'F!ghtClub'
                    }
                });

                var mailOptions = { from: 'ashokona@gmail.com', to: user.Email_Address, subject: 'Account Verification Token', text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/user' + '\/confirmation\/' + token.token + '.\n' };
                transporter.sendMail(mailOptions, function(err) {
                    if (err) {
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    }
                    res.status(200).json({
                        message: 'Verify email to login ' + user.Email_Address + '.',
                    });
                });
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
                var transporter = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'ashokona@gmail.com',
                        pass: 'F!ghtClub'
                    }
                });
                var mailOptions = { from: 'ashokona@gmail.com', to: result.Email_Address, subject: 'Account Verification Token', text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/user' + '\/confirmation\/' + token.token + '.\n' };
                transporter.sendMail(mailOptions, function(err) {
                    if (err) {
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    }
                    res.status(200).json({
                        message: 'A verification email has been sent to ' + result.Email_Address + '.',
                    });
                });
            });
        }
    });
});

router.get('/confirmation/:id', function(req, res, next) {
    // Find a matching token
    VerifyToken.findOne({ token: req.params.id }, function(err, token) {
        if (!token) return res.status(400).send({ type: 'not-verified', msg: 'We were unable to find a valid token. Your token my have expired.' });

        // If we found a token, find a matching user
        User.findOne({ _id: token.user }, function(err, user) {
            if (!user) return res.status(400).send({ msg: 'We were unable to find a user for this token.' });
            if (user.Email_Verified) return res.status(400).send({ type: 'already-verified', msg: 'This user has already been verified.' });

            // Verify and save the user
            user.setPassword(req.body.Password);
            user.save(function(err) {
                if (err) { return res.status(500).send({ msg: err.message }); }
                res.status(200).send("Password changed Sucessfully. Please log in.");
            });
        });
    });
});

router.get('/getProfile/:id', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) {
            console.log(err);
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
            User.findOne({ Email_Address: req.params.id }, function(err, user) {
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

router.put('/update/personal', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) {
            console.log(err);
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
            user.personalInfo = false;
            user.save(function(err) {
                if (err) { return res.status(500).json({ title: 'Personal Information Not Updated', error: err }); }
                res.status(200).json({ message: 'Personal information updated sucessfully', flag: 1 });
            });
        }

    })
});

router.put('/update/work', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) {
            console.log(err);
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
            if (typeof req.body.Position !== 'undefined') {
                user.Position = req.body.Position;
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
            user.workInfo = false;
            user.save(function(err) {
                if (err) { return res.status(500).json({ title: 'Work Information Not Updaed', error: err }); }
                res.status(200).json({ message: 'Work information updated sucessfully', flag: 1 });
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
                var transporter = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'ashokona@gmail.com',
                        pass: 'F!ghtClub'
                    }
                });

                console.log(req.headers);
                var mailOptions = { from: 'ashokona@gmail.com', to: result.Email_Address, subject: 'Reset Password Link', text: 'Hello,\n\n' + 'Please reset your account password by following the link: \nhttp:\/\/' + req.headers.host + '\/user' + '\/confirmation\/' + token.token + '.\n' };
                transporter.sendMail(mailOptions, function(err) {
                    if (err) {
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    }
                    res.status(200).json({
                        message: 'A rest link has been sent to' + result.Email_Address + '.',
                    });
                });
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
            user.Email_Verified = true;
            user.save(function(err) {
                if (err) { return res.status(500).send({ msg: err.message }); }
                res.status(200).send("The account has been verified. Please log in.");
            });
        });
    });
});

module.exports = router;