var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var OffersSchema = new Schema({
    Availability_id: { type: Schema.Types.ObjectId, ref: 'Availabilities' },
    JS_id: { type: Schema.Types.ObjectId, ref: 'User' },
    Employer_id: { type: Schema.Types.ObjectId, ref: 'User' },
    Position_id: { type: Schema.Types.ObjectId, ref: 'Positions' },
    Status: {
        type: String,
        enum: ['PENDING', 'DECLINED', 'ACCEPTED', 'NRTW', 'EXPIRED', 'HIRED'],
        default: 'PENDING'
    },
    messageId: { type: String, default: false },

    Date_Submitted: { type: Date, required: false, default: Date.now }
});

mongoose.model('Offers', OffersSchema);