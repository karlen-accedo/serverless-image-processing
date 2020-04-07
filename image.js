'use strict';
const jimp = require('jimp');
const uuid = require('uuid');
const aws = require('aws-sdk');
const {
    REGION: region,
    BUCKET:Bucket,
    BUCKET_FOLDER: BucketFolder,
    ACCESS_KEY_ID: accessKeyId,
    SECRET_ACCESS_KEY: secretAccessKey,
    S3_URL
} = process.env;

const s3 = new aws.S3({
    accessKeyId,
    secretAccessKey,
    region,
    Bucket,
    BucketFolder,
    AllowedHeaders: ['Authorization'],
    AllowedMethods: [],
    AllowedOrigins: ['*'],
    ACL: 'public-read',
    contentType: 'binary/octet-stream',
    signatureVersion: 'v4'
});

const imageType = "image/png";
function uploadS3({ file, awsConfig  }) {
    let id;
    file.id ? id = file.id : id = uuid.v4(); //eslint-disable-line

    const fileName = `${awsConfig.BucketFolder}/thumbnails/${id}_${file.name}${file.extension}`;


    return new Promise((resolve, reject) => {
        s3.putObject({
            Key: fileName,
            Bucket: awsConfig.Bucket,
            ACL: 'public-read',
            Body: file.stream
        }, (err, res) => {
            if (err)reject(err);
            else {
                resolve(res);
            }
        });
    });
}

const blint = async(event, context) => {

        const { images, modelName } = JSON.parse(event.body);
        const awsConfig = {
            Bucket: 'unico-dev',
            BucketFolder: 'images',
        };

        const imagePromise = jimp.read(`${S3_URL}${images[0]}`);
        const image = await imagePromise;

        const watermarks = await Promise.all(
            images.slice(1, images.length).map(img => jimp.read(`${S3_URL}${img}`))
        );


        watermarks.forEach((watermark) => {
            image.blit(watermark, 0, 0);
        });
        //
        //
        const imageId = uuid.v4();
        const buffer = await image.getBufferAsync(imageType);


        console.log("DONE ");

        await uploadS3({
            file: {
                id: imageId,
                name: modelName,
                stream: buffer,
                extension: '.png'
            },
            awsConfig
        });

        return {
            "statusCode": 200,
            "isBase64Encoded": false,
            "body": JSON.stringify({
                status: 'OK',
                result:'uploaded',
                url: `images/thumbnails/${imageId}_${modelName}.png`,
                fullPath: `${S3_URL}images/thumbnails/${imageId}_${modelName}.png`,
            })
        };

};

module.exports  = {
    blint
};
