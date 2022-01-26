'use strict';

// Require libraries
const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob")
const { BatchServiceClient, BatchSharedKeyCredentials } = require("@azure/batch")
const { v4: uuidv4 } = require('uuid');
const fs = require('fs')

// Load storage and batch environment variables
const storageAccountName = process.env.STORAGE_ACCOUNT_NAME,
      storageAccountKey = process.env.STORAGE_ACCOUNT_KEY,
      storageContainerName = process.env.STORAGE_CONTAINER_NAME,
      batchAccountName = process.env.BATCH_ACCOUNT_NAME,
      batchAccountKey = process.env.BATCH_ACCOUNT_KEY,
      batchEndpoint = process.env.BATCH_ENDPOINT

// Create storage clients and upload options
const storageCredentials = new StorageSharedKeyCredential(storageAccountName, storageAccountKey),
      storageClient = new BlobServiceClient(`https://${storageAccountName}.blob.core.windows.net`, storageCredentials),
      containerClient = storageClient.getContainerClient(storageContainerName),
      ONE_MEGABYTE = 1024 * 1024,
      uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 }

// Create batch client
const batchCredentials = new BatchSharedKeyCredentials(batchAccountName, batchAccountKey),
      batchClient = new BatchServiceClient(batchCredentials, batchEndpoint)

// Generate SAS token for uploaded file     
const generateSasToken = function(resourceUri, signingKey, policyName, expiresInMins) {
    resourceUri = encodeURIComponent(resourceUri);

    // Set expiration in seconds
    var expires = (Date.now() / 1000) + expiresInMins * 60;
    expires = Math.ceil(expires);
    var toSign = resourceUri + '\n' + expires;

    // Use crypto
    var hmac = crypto.createHmac('sha256', new Buffer(signingKey, 'base64'));
    hmac.update(toSign);
    var base64UriEncoded = encodeURIComponent(hmac.digest('base64'));

    // Construct authorization string
    var token = "SharedAccessSignature sr=" + resourceUri + "&sig="
    + base64UriEncoded + "&se=" + expires;
    if (policyName) token += "&skn="+policyName;
    return token;
};

/**
 *  submission controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::submission.submission', ({strapi}) => ({
    async create(ctx) {

        // Unwrap request body and add auto generated UUID
        ctx.request.body.data = JSON.parse(ctx.request.body.data)
        ctx.request.body.data.uuid = uuidv4()
        ctx.request.body.data = JSON.stringify(ctx.request.body.data)

        // Create DB Entry
        const response = await super.create(ctx)

        // Upload File
        const file = ctx.request.files['files.file']
        const stream = fs.createReadStream(file.path);
        const blobName = response.data.attributes.uuid + '.zip'
        const blockBlobClient = containerClient.getBlockBlobClient(blobName)

        try {
            await blockBlobClient.uploadStream(stream, uploadOptions.bufferSize, uploadOptions.maxBuffers, { blobHTTPHeaders: { blobContentType: file.type } });
            console.log(`File ${blobName} uploaded to Azure Blob storage.`);
        } catch (err) {
            console.error(err.message)
        }
        

        // const submissionId = ctx.request.body.data.uuid
        // const jobId = 'test-submissions'

        // // Task configuration object
        // const taskConfig = {
        //     id: `${submissionId}_process`,
        //     displayName: `process submission ${submissionId}`,
        //     commandLine: `./setup.sh ${ctx.request.body.data.path}`,
        // };

        // const task = batchClient.task.add(jobId, taskConfig, function (error, result) {
        //     if (error !== null) {
        //         console.log("Error occurred while creating task for " + submissionId + ". Details : " + error.response);
        //     }
        //     else {
        //         console.log("Task for submission : " + submissionId + " submitted successfully");
        //     }
        // });

        return response;
    },
}));
