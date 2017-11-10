var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongooseUniqueValidator = require('mongoose-unique-validator');

var OffersSchema = new Schema({
    Availability_id: { type: Schema.Types.ObjectId, ref: 'Availabilities' },
    JS_id: { type: Schema.Types.ObjectId, ref: 'User' },
    Employer_id: { type: Schema.Types.ObjectId, ref: 'User' },
    // Status: {
    //     type : String,
    //     enum : ['NotHired', 'Pending', 'Rejected','Declined', 'Hired'],
    //     default: 'NotHired'
    // },
    Status: { type: Boolean, default: false },
    Ready_to_work: { type: Boolean, default: false },
    messageSid: { type: String, default: false },
    Date_Submitted: { type: Date, required: true, default: Date.now }
});

OffersSchema.plugin(mongooseUniqueValidator, { message: 'is already taken.' });

mongoose.model('Offers', OffersSchema);