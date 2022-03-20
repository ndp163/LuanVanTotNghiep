const axios = require('axios');
const fs = require('fs');
const { uploadFile, createFolder, getFiles, copyFile, getFolders } = require('../utils/drive');
const download = require('image-downloader');

function random(n) {
    return Math.floor(Math.random() * n);
}

async function callAPI(LIMIT, CATE, PAGE) {
    let res = [];
    let resp = await axios.get(
        `https://shopee.vn/api/v4/search/search_items?by=relevancy&keyword=${CATE}&limit=${LIMIT}&newest=${PAGE}&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`
    );

    for (let item of resp.data.items) {
        res.push(...item.item_basic.images);
    }

    return res;
}

async function uploadDriverByGroup() {
    let foreignFolderId = '1SxqURlAv2O9-3kUSq7oA-b4mB0MJipW-';
    let imgFolderId = '17hWWWhKvcDu3JxsXnMHJedJaWroMow7i';

    // for (let i = 301; i <= 400; i++) {
    //     await createFolder(i, foreignFolderId);
    // }

    let data = await callAPI(50, '%C3%A1o%20thun', 2);
    console.log(data.length);

    let folders = await getFolders(foreignFolderId);
    console.log(folders);
    folders = folders.filter((folder) => folder.name > '300' && folder.name <= '394');

    let i = 0;
    for (let folder of folders) {
        console.log(folder.name);
        for (let j = 0; j < 2; j++)
            while (1) {
                try {
                    let image = data[i++];
                    await download.image({
                        url: `https://cf.shopee.vn/file/${image}`,
                        dest: `${image}.jpg`,
                    });
                    await uploadFile(`${image}.jpg`, folder.id, function () {
                        fs.unlink(`${image}.jpg`, (err) => {
                            if (err) console.log(err);
                        });
                    });
                    break;
                } catch (error) {
                    console.log(error);
                }
            }
    }

    // for (let image of data) {
    //     const filePath = `images/${image}.jpg`;
    //     try {
    //         await download.image({
    //             url: `https://cf.shopee.vn/file/${image}`,
    //             dest: filePath,
    //         });
    //     } catch (error) {
    //         console.log(error);
    //         continue;
    //     }
    //     await uploadFile(`${image}.jpg`, imgFolderId, function () {
    //         fs.unlink(filePath, (err) => {
    //             if (err) console.log(err);
    //         });
    //     });
    // }

    // let folders = await getFolders(foreignFolderId);
    // let files = await getFiles(imgFolderId);
    // console.log(folders);
    // folders = folders.filter((folder) => folder.name > '200' && folder.name <= '300');

    // for (let folder of folders) {
    //     let rand1 = random(files.length);
    //     let rand2 = random(files.length);
    //     while (rand1 === rand2) rand2 = random(files.length);

    //     console.log(folder.name);
    //     await copyFile(imgFolderId, folder.id, files[rand1]);
    //     await copyFile(imgFolderId, folder.id, files[rand2]);
    // }
}

async function uploadRobofAPI(filePath) {
    const image = fs.readFileSync(filePath, {
        encoding: 'base64',
    });
    axios({
        method: 'POST',
        url: 'https://api.roboflow.com/dataset/yolov5-pmqfe/upload',
        params: {
            api_key: 'U7fwrCMZpQ67YcgDPvvn',
            name: filePath.split('/')[1],
            split: 'test',
        },
        data: image,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    }).catch((err) => {
        console.log('Upload to robof unsuccess:' + err.message);
    });
}

async function uploadToRobof() {
    let data = await callAPI(100, '%C3%A1o%20thun', 15);

    for (let image of data) {
        const filePath = `images/${image}.jpg`;
        try {
            await download.image({
                url: `https://cf.shopee.vn/file/${image}`,
                dest: filePath,
            });
        } catch (error) {
            console.log('Image download error: ' + error);
            continue;
        }
        await uploadRobofAPI(filePath);
        fs.unlink(filePath, (err) => {
            if (err) console.log(err);
        });
    }
}

uploadDriverByGroup();
