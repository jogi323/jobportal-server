var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Payments = mongoose.model('Payments');
var Positions = mongoose.model('Positions');
var User = mongoose.model('User');

var auth = require('./auth');

router.get('/', auth.required, function(req, res, next) {
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
            next();
        }
    })
});

router.get('/all', function(req, res, next) {
    Positions.find({}, function(err, result) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        } else {
            res.status(200).json({ data: result })
        }
    });
});

router.post('/save', function(req, res, next) {
    var position = new Positions();
    position.Position_Name = req.body.Position_Name;
    position.save(function(err, result) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        } else {
            res.status(200).json({ message: 'Position added Sucessfully' });
        }
    });

});

router.put('/update', function(req, res, next) {
    Positions.findById(req.body._id, function(err, result) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        } else {
            if (typeof req.body.Position_Name !== 'undefined') {
                result.Position_Name = req.body.Position_Name;
            }
            result.save(function(err) {
                if (err) { return res.status(500).json({ title: 'Position not updated Not Updated', error: err }); }
                res.status(200).json({ message: 'Position updated sucessfully' });
            });
        }

    })
});

router.delete('/delete/:id', function(req, res, next) {
    Positions.findById(req.params.id, function(err, position) {
        if (err) {
            return res.status(500).json({
                title: 'An error occurred',
                error: err
            });
        } else {
            position.remove(function(err, result) {
                if (err) {
                    return res.status(500).json({
                        title: 'An error occurred',
                        error: err
                    });
                }
                User.update({}, { $pull: { Position: req.params.id } }, function(err, data) {
                    if (err) {
                        return res.status(500).json({
                            title: 'An error occurred',
                            error: err
                        });
                    }
                    res.status(200).json({
                        message: 'Position deleted Sucessfully',
                        obj: result
                    });
                })
            });
        }

    })
});


module.exports = router;