const mongoose = require('mongoose');
const Post = require('./Post');
const fs = require('fs');
const axios = require('axios');
const download = require('image-downloader');

var { PythonShell } = require('python-shell');

function runPythonFile(pythonFile, args) {
    return new Promise((resolve, reject) => {
        try {
            PythonShell.run(pythonFile, { mode: 'text', args }, function (err, results) {
                if (err) {
                    console.log(err);
                }
                resolve(String(results).split('result: ')[1]);
            });
        } catch {
            console.log('error running python code');
            reject();
        }
    });
}

//const sendMail = require('./utils/mailer.js');

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

async function getProducts(limit, page, keyword) {
    // let resp = await axios.get(
    //     `https://shopee.vn/api/v4/search/search_items?by=relevancy&limit=${limit}&match_id=${matchId}&newest=${page}&order=desc&page_type=search&scenario=PAGE_OTHERS&version=2`
    // );
    let resp = await axios.get(
        `https://shopee.vn/api/v4/search/search_items?by=relevancy&keyword=${keyword}&limit=${limit}&newest=${page}&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`
    );
    return resp.data.items;
}

async function getPricesAndTimes(itemId, shopId) {
    let resp = await axios.get(
        `https://apiv2.beecost.vn/product/history_price?product_base_id=1__${itemId}__${shopId}`
    );
    if (!resp.data.data.product_history_data)
        return null;
    let price = resp.data.data.product_history_data.item_history.price;
    let ts = resp.data.data.product_history_data.item_history.price_ts;

    return { price, ts };
}

function obj2ArrayObj(data) {
    const priceAndTs = [];
    for (let i = 0; i < data.price.length; i++) {
        priceAndTs.push({
            price: data.price[i],
            ts: data.ts[i],
        });
    }
    return priceAndTs;
}

async function findGroup(images) {
    const posts = await Post.find().sort({ groupId: -1 });
    const groupId = posts[0] ? posts[0].groupId + 1 : 1;
    for (let post of posts) {
        console.log('Tìm ảnh trùng...');
        const isMatch = await matchImgs(images, post.images);
        console.log(isMatch);
        console.log('Done');

        if (isMatch) return new Promise(resolve => {
            resolve(post.groupId);
        });
    }
    return new Promise(resolve => {
        resolve(groupId);
    });
}

async function matchImgs(imgs1, imgs2) {
    for (let img1 of imgs1)
        for (let img2 of imgs2) {
            const isDup = await runPythonFile('./DuplicationDetectionV2/main.py', [
                `./images/${img1}.jpg`,
                `./images/${img2}.jpg`,
            ]);
            console.log(isDup);
            if (isDup == 'True') {
                console.log(img1, img2);
                return true;
            }
        }

    return false;
}

async function updatePost(oldPost, newItem) {
    const prices = oldPost.prices;
    const priceBeforeDiscount = newItem.item_basic.price_before_discount;
    const price = newItem.item_basic.price;
    const name = newItem.item_basic.name;
    const prevPrice = prices[prices.length - 1].price;

    if (price <= 0.5 * prevPrice) {
        for (let mail in oldPost.emailSub) {
            sendMail(mail, oldPost.url, name, prevPrice, price);
        }
    }
    prices.push({
        price,
        ts: Date.now(),
    });

    await Post.updateOne(
        { url: oldPost.url },
        {
            priceBeforeDiscount,
            prices,
        }
    );
}

async function createPost(item, cate) {
    const shopId = item.item_basic.shopid;
    const itemId = item.item_basic.itemid;
    const name = item.item_basic.name;
    const priceBeforeDiscount = item.item_basic.price_before_discount;
    const images = [item.item_basic.image];

    // price and times of the price of the product
    const priceAndTs = await getPricesAndTimes(itemId, shopId);

    // Check price history
    if (!priceAndTs) {
        console.log('Not exists price history');
        return;
    }

    return new Promise(resolve => {
        Promise.all([findGroup(images), runPythonFile('./PredictPrice/main.py', JSON.stringify(priceAndTs))])
        .then(([groupId, futurePrice]) => {
            new Post({
                title: name,
                images,
                priceBeforeDiscount,
                prices: obj2ArrayObj(priceAndTs),
                url: `https://shopee.vn/${name.split(' ').join('-')}-i.${shopId}.${itemId}`,
                cate,
                groupId,
                futurePrice: futurePrice ? JSON.parse(futurePrice.replace(/'/g, '"')) : {}
            }).save().then(() => {
                fs.appendFile('./measure.txt', parseInt((Date.now() - startTime)/1000) + ' ',  function (err) {
                    if (err) throw err;
                    console.log('Writed!');
                });
                resolve();
            });
        });
    });
}

async function crawlData() {
    const LIMIT = 100;
    // const MATCH_ID = 11035572;
    const KEYWORD = '%C3%A1o%20thun%20nam';
    const CATE_NAME = 'Áo thun nam';
    const PAGE = 4;
    const products = await getProducts(LIMIT, PAGE, KEYWORD);

    for (let product of products) {
        let image = product.item_basic.image;

        const shopId = product.item_basic.shopid;
        const itemId = product.item_basic.itemid;
        const name = product.item_basic.name;
        const url = `https://shopee.vn/${name.split(' ').join('-')}-i.${shopId}.${itemId}`;

        const posts = await Post.find({ url });
        if (posts.length) {
            // await updatePost(posts[0], product);
            console.log('Is duplicated');
            continue;
        } else {
            // download image
            while (1) {
                try {
                    await download.image({
                        url: `https://cf.shopee.vn/file/${image}`,
                        dest: `images/${image}.jpg`,
                    });
                    break;
                } catch (error) {
                    console.log(error);
                }
            }

            await createPost(product, CATE_NAME);
        }
    }

    console.log('DONE!!!');
}

connectDB();
startTime = Date.now();

// (async () => {
//     await Post.deleteMany({});
//     console.log(await Post.find({}));
// })()


crawlData();
