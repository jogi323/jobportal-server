var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongooseUniqueValidator = require('mongoose-unique-validator');

var AvailabilitiesSchema = new Schema({
    JS_id: { type: Schema.Types.ObjectId, ref: 'User' },
    Date: { type: Date, required: true },
    Time_Start: { type: String, required: true },
    Time_Finish: { type: String, required: true },
    Time_Start1: { type: String, required: false },
    Time_Finish1: { type: String, required: false },
    Hours_Guaranteed: { type: Number, required: true },
    Hired: { type: Boolean, default: false },
    Date_Submitted: { type: Date, required: false, default: Date.now }
});

mongoose.model('Availabilities', AvailabilitiesSchema);