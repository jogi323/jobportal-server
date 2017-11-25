var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongooseUniqueValidator = require('mongoose-unique-validator');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var secret = require('../config').secret;

var UserSchema = new Schema({
    Firstname: String,
    Lastname: String,
    Email_Address: { type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true },
    hash: String,
    salt: String,
    userType: {
        type: String,
    },
    Address_street: String,
    Address_Unit: String,
    City: String,
    State: String,
    Zip_Code: Number,
    Phone1: Number,
    Phone2: Number,
    locationLat: Number,
    locationLng: Number,
    personalInfo: { type: Boolean, default: false },
    workInfo: { type: Boolean, default: false },
    Position: { type: Schema.Types.ObjectId, ref: 'Positions' },
    Experience: Number,
    Hourly_Pay: Number,
    Practice_Name: String,
    image: String,
    Speciality: String,
    Practice_Phone: Number,
    Nr_of_Operations: Number,
    Nr_of_Staff: Number,
    Travel_Distance: Number,
    Languages: Array,
    Dental_School: String,
    Year_Graduated: Number,
    License_Nr: String,
    Years_in_Practice: Number,
    Contact_Person: String,
    Contact_Phone_Nr: Number,
    Referred_By: String,
    Date_Submitted: Date,
    Email_Verified: { type: Boolean, default: false },
    Status: { type: Boolean, default: false },
    Payments_id: [{ type: Schema.Types.ObjectId, ref: 'Payments' }],
    Offers_id: [{ type: Schema.Types.ObjectId, ref: 'Offers' }],
    otp: { type: Number, expires: 300 }
});

UserSchema.plugin(mongooseUniqueValidator, { message: 'is already taken.' });

UserSchema.methods.validPassword = function(Password) {
    var hash = crypto.pbkdf2Sync(Password, this.salt, 10000, 512, 'sha512').toString('hex');
    return this.hash === hash;
};

UserSchema.methods.setPassword = function(Password) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(Password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.generateJWT = function() {
    var today = new Date();
    var exp = new Date(today);
    exp.setDate(today.getDate() + 60);

    return jwt.sign({
        id: this._id,
        Email_Address: this.Email_Address,
        exp: parseInt(exp.getTime() / 1000),
    }, secret);
};

UserSchema.methods.toAuthJSON = function() {
    return {
        Email_Address: this.Email_Address,
        Firstname: this.Firstname,
        Lastname: this.Lastname,
        userType: this.userType,
        personalInfo: this.personalInfo,
        workInfo: this.workInfo,
    };
};

UserSchema.methods.toProfileJSONFor = function(user) {
    return {
        Email_Address: this.Email_Address,
        Firstname: this.Firstname,
        Lastname: this.Lastname,
        //image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
    };
};

mongoose.model('User', UserSchema);