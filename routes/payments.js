var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Payments = mongoose.model('Payments');
var Availabilities = mongoose.model('Availabilities');
var User = mongoose.model('User');
var Offers = mongoose.model('Offers');
var VerifyToken = mongoose.model('VerifyToken');
var auth = require('./auth');

router.get('/', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) { return res.status(500).json({ title: 'An error occurred', error: err }); }
        if (!user) { return res.status(401).json({ title: 'Not Authorised', error: { message: 'Login Again' } }) } else {
            Payments.find({ Employer_id: user._id })
                .populate('Employer_id', 'Firstname')
                .exec(function(err, result) {
                    if (err) { return res.status(500).json({ title: 'An error occurred', error: err }); }
                    res.status(200).json({
                        data: result
                    });
                })
        }
    })
});

router.post('/pay', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err, user) {
        if (err) { return res.status(500).json({ title: 'An error occurred', error: err }); }
        if (!user) { return res.status(401).json({ title: 'Not Authorised', error: { message: 'Login Again' } }) } else {
            var payment = new Payments();
            console.log(req.body)
            payment.Card_Nr = req.body.Card_Nr;
            payment.Billing_Name = req.body.Billing_Name;
            payment.Expiration_Month = req.body.Expiration_Month;
            payment.Expiration_Year = req.body.Expiration_Year;
            payment.Billing_Address = req.body.Billing_Address;
            payment.City = req.body.City;
            payment.State = req.body.State;
            payment.Zip_Code = req.body.Zip_Code;
            //payment.Date_Submitted = req.body.Date_Submitted;
            payment.Amount = req.body.Amount;
            payment.Employer_id = user._id;
            if (typeof req.body.Position_id !== 'undefined') {
                payment.Position_id = req.body.Position_id;
            }
            if (typeof req.body.Billing_Address_Unit !== 'undefined') {
                payment.Billing_Address_Unit = req.body.Billing_Address_Unit;
            }
            payment.save(function(err, result) {
                if (err) { return res.status(500).json({ title: 'Work Information Not Updaed', error: err }); } else {
                    user.Payments_id.push(result);
                    user.save();
                    res.status(200).json({
                        message: 'Payment Sucessfull',
                    });
                }
            });
        }
    })
});

module.exports = router;