var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongooseUniqueValidator = require('mongoose-unique-validator');

var OffersSchema = new Schema({
    Availability_id: { type: Schema.Types.ObjectId, ref: 'Availabilities' },
    JS_id: { type: Schema.Types.ObjectId, ref: 'User' },
    Employer_id: { type: Schema.Types.ObjectId, ref: 'User' },
    Status: {
        type: String,
        enum: ['PENDING', 'DECLINED', 'ACCEPTED', 'EXPIRED'],
        default: 'PENDING'
    },
    messageId: { type: String, default: false },
    // Status: { type: Boolean, default: false },
    Ready_to_work: {
        type: String,
        enum: ['PENDING', 'DECLINED', 'ACCEPTED', 'EXPIRED'],
        default: 'PENDING'
    },
    // messageSid: { type: String, default: false },
    Date_Submitted: { type: Date, required: false, default: Date.now }
});

OffersSchema.plugin(mongooseUniqueValidator, { message: 'is already taken.' });

mongoose.model('Offers', OffersSchema);