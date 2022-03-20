const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema(
    {
        title: { type: String, required: true },
        images: { type: [String] },
        priceBeforeDiscount: { type: Number },
        prices: { type: [{ price: Number, ts: Date }] },
        url: { type: String, required: true },
        cate: { type: String, required: true },
        emailSub: { type: [String], default: [] },
        groupId: { type: Number },
        futurePrice: { type: { price: [Number], ts: [Date] } },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('posts', PostSchema);
