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
    let prices = resp.data.data.product_history_data.item_history.price;
    let ts = resp.data.data.product_history_data.item_history.price_ts;

    return { prices, ts };
}

function obj2ArrayObj(data) {
    const priceAndTs = [];
    for (let i = 0; i < data.prices.length; i++) {
        priceAndTs.push({
            price: data.prices[i],
            ts: data.ts[i],
        });
    }
    return priceAndTs;
}

async function findGroup(images) {
    const posts = await Post.find().sort({ groupId: -1 });
    const groupId = posts[0] ? posts[0].groupId + 1 : 1;
    for (let post of posts) {
        const isMatch = await matchImgs(images, post.images);
        if (isMatch) return post.groupId;
    }
    return groupId;
}

async function matchImgs(imgs1, imgs2) {
    for (let img1 of imgs1)
        for (let img2 of imgs2) {
            const isDup = await runPythonFile('./DuplicationDetection/main.py', [
                `./images/${img1}.jpg`,
                `./images/${img2}.jpg`,
            ]);
            if (isDup == 'True') return true;
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
    const images = item.item_basic.images;

    // price and times of the price of the product
    const priceAndTs = await getPricesAndTimes(itemId, shopId);
    // find group
    const groupId = await findGroup(images);

    // find future price
    const futurePrice = await runPythonFile('./PredictPrice/main.py', JSON.stringify(priceAndTs));
    console.log(futurePrice);

    const newPost = new Post({
        title: name,
        images,
        priceBeforeDiscount,
        prices: obj2ArrayObj(priceAndTs),
        url: `https://shopee.vn/${name.split(' ').join('-')}-i.${shopId}.${itemId}`,
        cate,
        groupId,
    });

    await newPost.save();
}

//connectDB();

async function crawlData() {
    const LIMIT = 100;
    // const MATCH_ID = 11035572;
    const KEYWORD = '%C3%A1o%20thun%20nam';
    const CATE_NAME = 'Áo thun nam';
    const PAGE = 0;
    const products = await getProducts(LIMIT, PAGE, KEYWORD);

    // image processing

    for (let product of products) {
        let images = product.item_basic.images;

        for (let image of images) {
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
        }

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
            await createPost(item, CATE_NAME);
        }
    }

    console.log('DONE!!!');
}

crawlData();
