var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongooseUniqueValidator = require('mongoose-unique-validator');

var AvailabilitiesSchema = new Schema({
    // Availability_id: {type: Schema.Types.ObjectId, ref: 'User'},
    // Position_id: {type: Schema.Types.ObjectId, ref: 'User'},
    JS_id: { type: Schema.Types.ObjectId, ref: 'User' },
    Date: { type: Date, required: true },
    Time_Start: { type: String, required: true },
    Time_Finish: { type: String, required: true },
    Hours_Guaranteed: { type: Number, required: true },
    // Hired : {
    //     type : String,
    //     enum : ['NotHired', 'Pending', 'Rejected','Declined', 'Hired'],
    //     default: 'NotHired'
    // },
    Hired: { type: Boolean, default: false },
    Date_Submitted: { type: Date, required: false, default: Date.now }
});

// AvailabilitiesSchema.plugin(mongooseUniqueValidator, { message: 'is already taken.' });

mongoose.model('Availabilities', AvailabilitiesSchema);