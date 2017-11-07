var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Availabilities = mongoose.model('Availabilities');
var User = mongoose.model('User');
var VerifyToken = mongoose.model('VerifyToken');
var auth = require('./auth');

router.get('/all', auth.required, function(req, res, next) {
    User.findById(req.payload.id, function(err,user){
        if (err) { return res.status(500).json({ title: 'An error occurred',error: err }); }    
        if (!user) { return res.status(401).json({ title: 'Not Authorised', error: {message: 'Login Again'} }) }
        else{
            Availabilities.find({JS_id:user._id},function(err,result){
                if (err) { return res.status(500).json({ title: 'An error occurred',error: err }); } 
                res.status(200).json({
                    data: result
                });
            })
        }
    })
});

router.post('/query', auth.required, function(req, res, next) {
    console.log(req.body)
    User.findById(req.payload.id, function(err,user){
        if (err) { return res.status(500).json({ title: 'An error occurred',error: err }); }    
        if (!user) { return res.status(401).json({ title: 'Not Authorised', error: {message: 'Login Again'} }) }
        else{
            if(typeof  req.body.Date !== 'undefined' && typeof req.body.Hours_Guaranteed == 'undefined'){
                Availabilities.find({Date:req.body.Date})
                    // .where('Hired').eq('NotHired')
                    .populate({
                        path: 'JS_id',
                        // match: { Position: { $eq: 'Dental Assistant' }, Hourly_Pay: { $eq: 5 }},
                        select: ['Position', 'Lastname', 'Hourly_Pay', 'Experience', 'Zip_Code', 'locationLat', 'locationLng'],
                    })
                    .exec(function(err,result){
                        if (err) { return res.status(500).json({ title: 'An error occurred',error: err }); } 
                        res.status(200).json({
                            data: result
                        });
                    })
            }else if( typeof req.body.Hours_Guaranteed !== 'undefined'){
                Availabilities.find({Date:req.body.Date})
                    // .where('Hired').eq('NotHired')
                    .where('Hours_Guaranteed').eq(req.body.Hours_Guaranteed)
                // .populate('JS_id')
                .populate({
                    path: 'JS_id',
                    select: ['Position', 'Lastname', 'Hourly_Pay', 'Experience', 'Zip_Code', 'locationLat', 'locationLng'],
                })
                .exec(function(err,result){
                    if (err) { return res.status(500).json({ title: 'An error occurred',error: err }); } 
                    res.status(200).json({
                        data: result
                    });
                })
            }
            else if(req.body.Position != 'undefined'){
                Availabilities.find({Date:req.body.Date})
                    // .where('Hired').eq('NotHired')
                    .where('Hours_Guaranteed').eq(req.body.Hours_Guaranteed)
                // .populate('JS_id')
                .populate({
                    path: 'JS_id',
                    match: { Position: { $eq: req.body.Position }},                    
                    select: ['Position', 'Lastname', 'Hourly_Pay', 'Experience', 'Zip_Code', 'locationLat', 'locationLng'],
                })
                .exec(function(err,result){
                    if (err) { return res.status(500).json({ title: 'An error occurred',error: err }); } 
                    res.status(200).json({
                        data: result
                    });
                })
            }
            else if(req.body.Hourly_Pay != 'undefined'){
                Availabilities.find({Date:req.body.Date})
                    // .where('Hired').eq('NotHired')
                    .where('Hours_Guaranteed').eq(req.body.Hours_Guaranteed)
                // .populate('JS_id')
                .populate({
                    path: 'JS_id',
                    match: { Position: { $eq: req.body.Position }, Hourly_Pay: { $eq: req.body.Hourly_Pay }},
                    select: ['Position', 'Lastname', 'Hourly_Pay', 'Experience', 'Zip_Code', 'locationLat', 'locationLng'],
                })
                .exec(function(err,result){
                    if (err) { return res.status(500).json({ title: 'An error occurred',error: err }); } 
                    res.status(200).json({
                        data: result
                    });
                })
            }

            
        }
    })
});

router.post('/save', auth.required, function(req, res, next) {
    var AvailabilitiesList = req.body;
    var SavedavailabilitiesLength = 0;
    User.findById(req.payload.id, function(err,user){
        if (err) { return res.status(500).json({ title: 'An error occurred',error: err }); }    
        if (!user) { return res.status(401).json({ title: 'Not Authorised', error: {message: 'Login Again'} }) }
        else{

            AvailabilitiesList.forEach(function(availabilities) {
                Availabilities.find({'Date':availabilities.Date},function (err, avail){
                    if(err){
                        console.log(err)
                    }
                    if(avail.length != 0){
                        if(typeof availabilities.Time_Start !== 'undefined'){
                            avail[0].Time_Start = availabilities.Time_Start
                        }
                        if(typeof availabilities.Time_Finish !== 'undefined'){
                            avail[0].Time_Finish = availabilities.Time_Finish
                        }
                        if(typeof availabilities.Hours_Guaranteed !== 'undefined'){
                            avail[0].Hours_Guaranteed = availabilities.Hours_Guaranteed
                        }
                        if(typeof availabilities.Date_Submitted !== 'undefined'){
                            avail[0].Date_Submitted = availabilities.Date_Submitted
                        }
                        avail[0].save(function (err, result) {
                            if (err) { return res.status(500).json({ title: 'Work Information Not Updaed',error: err }); }  
                            else{
                                AvailabilitiesList.splice(0, 1);
                                if(AvailabilitiesList.length === 0){
                                    res.status(200).json({
                                        message: 'Saved successfully',
                                    });
                                }
                            }
                        });
                    }
                    else{
                        var availability = new Availabilities();
                            availability.JS_id = user;
                            availability.Date = availabilities.Date;
                            availability.Time_Start = availabilities.Time_Start;
                            availability.Time_Finish = availabilities.Time_Finish;
                            availability.Hours_Guaranteed = availabilities.Hours_Guaranteed;
                            availability.Date_Submitted = availabilities.Date_Submitted;

                        availability.save(function(err, result){
                            if (err) { return res.status(500).json({ title: 'There was problem inserting Data',error: err }); }  
                            else{
                                AvailabilitiesList.splice(0, 1);
                                if(AvailabilitiesList.length === 0){
                                    res.status(200).json({
                                        message: 'Saved successfully',
                                    });
                                }
                            }
                        })
                    }
                })
                
            });
        }
    })
});

router.delete('/purge/:id', auth.required, function(req, res, next) {
    console.log(req.params.id)
    User.findById(req.payload.id, function(err,result){
        if (err) { return res.status(500).json({ title: 'An error occurred',error: err }); }    
        if (!result) { return res.status(401).json({ title: 'Not Authorised', error: {message: 'Login Again'} }) }
        else{
            Availabilities.findByIdAndRemove(req.params.id,function(err,result){
                if (err) { return res.status(500).json({ title: 'Unable to delete',error: err }); } 
                res.status(200).json({
                    message:"deleted Successfully"
                });
            })
        }
    })
});

module.exports = router;