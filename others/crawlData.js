const mongoose = require('mongoose');
const Post = require('../Post');
const fs = require('fs');
const axios = require('axios');
const download = require('image-downloader');
const { uploadFile, createFolder } = require('../utils/drive');
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

async function uploadImages(imgs, folderId) {
    const images = [];

    for (let image of imgs) {
        const filePath = `${image}.jpg`;

        try {
            await download.image({
                url: `https://cf.shopee.vn/file/${image}`,
                dest: filePath,
            });
            images.push(image);
        } catch (error) {
            console.log(error);
            continue;
        }

        await uploadFile(filePath, folderId, function () {
            fs.unlink(filePath, (err) => {
                if (err) console.log(err);
            });
        });
    }
    return images;
}

async function getProducts(limit, page, matchId) {
    // let resp = await axios.get(
    //     `https://shopee.vn/api/v4/search/search_items?by=relevancy&limit=${limit}&match_id=${matchId}&newest=${page}&order=desc&page_type=search&scenario=PAGE_OTHERS&version=2`
    // );
    let resp = await axios.get(
        `https://shopee.vn/api/v4/search/search_items?by=relevancy&keyword=vali&limit=5&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`
    );
    return resp.data.items;
}

async function getPricesAndTimes(itemId, shopId) {
    let resp = await axios.get(
        `https://apiv2.beecost.vn/product/history_price?product_base_id=1__${itemId}__${shopId}`
    );
    let prices = resp.data.data.product_history_data.item_history.price;
    let ts = resp.data.data.product_history_data.item_history.price_ts;

    const priceAndTs = [];
    for (let i = 0; i < prices.length; i++) {
        priceAndTs.push({
            price: prices[i],
            ts: ts[i],
        });
    }
    return priceAndTs;
}

async function findGroup(images) {
    const posts = await Post.find().sort({ groupId: -1 });
    const groupId = posts[0] ? posts[0].groupId + 1 : 1;
    for (let post of posts) {
        if (matchImgs(images, post.images)) {
            return post.groupId;
        }
    }
    return groupId;
}

function matchImgs(imgs1, imgs2) {
    return Math.random() < 0.1;
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
    const priceBeforeDiscount = newItem.item_basic.price_before_discount;

    // price and times of the price of the product
    const priceAndTs = await getPricesAndTimes(itemId, shopId);
    // find group
    //const groupId = await findGroup(images);

    const newPost = new Post({
        title: name,
        images,
        priceBeforeDiscount,
        prices: priceAndTs,
        url,
        cate,
        groupId,
    });

    await newPost.save();
}

//connectDB();

async function crawlData() {
    const LIMIT = 10;
    const MATCH_ID = 11035572;
    const CATE_NAME = 'Suit Jackets & Blazers';
    const PAGE = 0;
    const items = await getProducts(LIMIT, PAGE, MATCH_ID);

    // generate folder
    const FOLDER_ID = '1hjsxMdZf7zNa7HFGdIBg3ldbgP9GCCUJ';
    // let newFolderID = await createFolder(CATE_NAME, FOLDER_ID);
    let newFolderID = '1v_l6DWPJllUBs4WYUJ2_kkziLCPf_rUJ';
    // image processing

    for (let item of items) {
        let imagesResp = item.item_basic.images;
        const images = await uploadImages(imagesResp, newFolderID);
    }

    // for (let item of items) {
    //     const shopId = item.item_basic.shopid;
    //     const itemId = item.item_basic.itemid;
    //     const name = item.item_basic.name;
    //     const url = `https://shopee.vn/${name.split(' ').join('-')}-i.${shopId}.${itemId}`;

    //     const posts = await Post.find({ url });
    //     if (posts.length) {
    //         await updatePost(posts[0], item);
    //     } else {
    //         await createPost(item, CATE_NAME);
    //     }
    // }

    console.log('DONE!!!');
}

crawlData();
