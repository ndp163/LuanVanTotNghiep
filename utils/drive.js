const fs = require('fs');
const { google } = require('googleapis');

const CLIENT_ID = '973993279018-fmb5hnrrd950fsodgrk1spq2uqton4ju.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN =
    '1//04ah_hg-735v5CgYIARAAGAQSNwF-L9IrAIHMnDkB9QLBHlZRPAT1TcNwjkO5diG7G_d0q4UXL-kxcTtUCSux7-xPVoYhFbuU6W8';

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({
    version: 'v3',
    auth: oAuth2Client,
});

async function uploadFile(filePath, folderId, callback) {
    try {
        const response = await drive.files.create({
            resource: {
                name: filePath,
                parents: [folderId],
            },
            media: {
                mimeType: 'image/jpg',
                body: fs.createReadStream(filePath),
            },
        });

        if (callback) callback();
    } catch (error) {
        console.log(error.message);
    }
}

async function deleteFile() {
    try {
        const response = await drive.files.delete({
            fileId: 'YOUR FILE ID',
        });
        console.log(response.data, response.status);
    } catch (error) {
        console.log(error.message);
    }
}

// deleteFile();
async function generatePublicUrl() {
    try {
        const fileId = 'YOUR FILE ID';
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        const result = await drive.files.get({
            fileId: fileId,
            fields: 'webViewLink, webContentLink',
        });
        console.log(result.data);
    } catch (error) {
        console.log(error.message);
    }
}

async function createFolder(name, folderId) {
    try {
        let res = await drive.files.create({
            resource: {
                name: name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [folderId],
            },
            fields: 'id',
        });
        return res.data.id;
    } catch (error) {
        createFolder(name, folderId);
    }
}

async function getFiles(folderId) {
    let res = await drive.files.list({
        q: `mimeType='image/jpeg' and '${folderId}' in parents`,
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
        pageToken: null,
    });
    return res.data.files;
}

async function getFolders(folderId) {
    let res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and '${folderId}' in parents`,
        fields: 'nextPageToken, files(id, name)',
        spaces: 'drive',
        pageToken: null,
    });
    return res.data.files;
}

async function copyFile(oldFolderId, newFolderId, file) {
    const cloned = (
        await drive.files.copy({
            fileId: file.id,
        })
    ).data;

    // Move copy to new folder
    await drive.files.update({
        fileId: cloned.id,
        addParents: newFolderId,
        removeParents: oldFolderId,
        resource: { name: file.name },
        fields: 'id, parents',
    });
}

module.exports = { uploadFile, createFolder, getFiles, getFolders, copyFile };
