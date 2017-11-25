var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var mongooseUniqueValidator = require('mongoose-unique-validator');

var PaymentsSchema = new Schema({
    Employer_id: { type: Schema.Types.ObjectId, ref: 'User' },
    Offers_id: [{ type: Schema.Types.ObjectId, ref: 'Offers' }],
    JS_id: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    Card_Nr: Number,
    Billing_Name: String,
    Expiration_Month: Number,
    Expiration_Year: Number,
    Billing_Address: String,
    Billing_Address_Unit: String,
    Status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'DECLINED'],
        default: 'PENDING'
    },
    City: String,
    State: String,
    Zip_Code: Number,
    Amount: Number,
    Date_Submitted: { type: Date, required: true, default: Date.now }
});

PaymentsSchema.plugin(mongooseUniqueValidator, { message: 'is already taken.' });

mongoose.model('Payments', PaymentsSchema);