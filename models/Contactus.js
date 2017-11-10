var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongooseUniqueValidator = require('mongoose-unique-validator');

var ContactusSchema = new Schema({
    Firstname: { type: String },
    Lastname: { type: String },
    Email_Address: { type: String, required: true },
    Comments: { type: String, required: true },
    Date_Submitted: { type: Date, required: true, default: Date.now }
});

ContactusSchema.plugin(mongooseUniqueValidator, { message: 'is already taken.' });

mongoose.model('Contactus', ContactusSchema);