var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var cors = require('cors');
var nodemailer = require("nodemailer");

var isProduction = process.env.NODE_ENV === 'production';
var mongodbUrl = require('./config').mongodbUrl;

require('./models/User');
require('./models/VerifyToken');
require('./models/Availabilities');
require('./models/Payments');
require('./models/Offers');
require('./models/Contactus');

var index = require('./routes/index');
var users = require('./routes/users');
var availabilities = require('./routes/availabilities');
var payments = require('./routes/payments');
var offers = require('./routes/offers');

var app = express();

app.use(cors());

mongoose.connect(mongodbUrl);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'dist')));



app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, DELETE, OPTIONS');
    next();
});

app.use('/', index);
app.use('/user', users);
app.use('/availability', availabilities);
app.use('/payments', payments);
app.use('/offers', offers);
app.get('/*',function(req,res){
    res.sendFile(__dirname+'dist/index.html');
})
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler

app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;