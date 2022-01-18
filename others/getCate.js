const mongoose = require('mongoose');
const Post = require('../Post');

const MONGODB_URL =
    'mongodb+srv://smartshopping:leiman@smartshopping.eom4w.mongodb.net/SmartShopping?retryWrites=true&w=majority';

async function connectDB() {
    try {
        if (mongoose.connections[0].readyState) {
            console.log('Already connected.');
            return;
        }

        await mongoose.connect(
            MONGODB_URL,
            { useNewUrlParser: true, useUnifiedTopology: true },
            (err) => {
                if (err) throw err;
                console.log('Connected to mongodb.');
            }
        );
    } catch (error) {
        console.log(error.message);
        process.exit(1);
    }
}

connectDB();
(async () => {
    let posts = await Post.find();
    console.log(posts);
})();
