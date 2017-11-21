var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var offersTokenSchema = new Schema({
    offerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Offers' },
    token: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now, expires: 7200 }
});

mongoose.model('OffersToken', offersTokenSchema);