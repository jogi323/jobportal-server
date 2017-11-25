var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongooseUniqueValidator = require('mongoose-unique-validator');

var PositionsSchema = new Schema({
    Position_Name: { type: String, lowercase: true, unique: true },
    Date_Submitted: { type: Date, required: false, default: Date.now }
});

PositionsSchema.plugin(mongooseUniqueValidator, { message: 'is already taken.' });

mongoose.model('Positions', PositionsSchema);