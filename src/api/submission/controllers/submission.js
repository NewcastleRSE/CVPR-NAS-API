'use strict';

// Require libraries
const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require("@azure/storage-blob")
const { BatchServiceClient, BatchSharedKeyCredentials } = require("@azure/batch")
const { v4: uuidv4 } = require('uuid');
const fs = require('fs')

// Load storage and batch environment variables
const storageAccountName = process.env.STORAGE_ACCOUNT_NAME,
      storageAccountKey = process.env.STORAGE_ACCOUNT_KEY,
      storageContainerName = process.env.STORAGE_CONTAINER_NAME,
      batchAccountName = process.env.BATCH_ACCOUNT_NAME,
      batchAccountKey = process.env.BATCH_ACCOUNT_KEY,
      batchEndpoint = process.env.BATCH_ENDPOINT,
      sasOutputFolderToken = process.env.OUTPUT_FOLDER

// Create storage clients and upload options
const storageCredentials = new StorageSharedKeyCredential(storageAccountName, storageAccountKey),
      storageClient = new BlobServiceClient(`https://${storageAccountName}.blob.core.windows.net`, storageCredentials),
      containerClient = storageClient.getContainerClient(storageContainerName),
      ONE_MEGABYTE = 1024 * 1024,
      uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 }

// Create batch client
const batchCredentials = new BatchSharedKeyCredentials(batchAccountName, batchAccountKey),
      batchClient = new BatchServiceClient(batchCredentials, batchEndpoint)

/**
 *  submission controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::submission.submission', ({strapi}) => ({
    async create(ctx) {

        let response = null
        const submissionUUID = uuidv4()

        // Upload File
        try {
            const file = ctx.request.files['files.file']
            const stream = fs.createReadStream(file.path);
            const blobName = submissionUUID + '.zip'
            const blockBlobClient = containerClient.getBlockBlobClient(blobName)

            await blockBlobClient.uploadStream(stream, uploadOptions.bufferSize, uploadOptions.maxBuffers, { blobHTTPHeaders: { blobContentType: file.type } })
            console.log(`File ${blobName} uploaded to Azure Blob storage.`)

            // Create expiry date one year in the future
            let expiry =  new Date();
            expiry.setFullYear(new Date().getFullYear() + 1)
            
            // Generate SAS token
            const sasToken = generateBlobSASQueryParameters({
                containerName: storageContainerName,
                blobName: blobName,
                expiresOn: expiry,
                permissions: BlobSASPermissions.parse("r")
            }, storageCredentials)

            //Generate SAS URL
            const sasUrl = `${blockBlobClient.url}?${sasToken}`
            
            // Unwrap request body and add auto generated UUID
            ctx.request.body.data = JSON.parse(ctx.request.body.data)
            ctx.request.body.data.uuid = submissionUUID
            ctx.request.body.data.path = sasUrl
            ctx.request.body.data = JSON.stringify(ctx.request.body.data)

            // Create DB Entry
            response = await super.create(ctx)
            
        } catch (err) {
            console.error(err.message)
        }
        
        try {
            // Task configuration object
            const taskConfig = {
                id: `${submissionUUID}`,
                displayName: `process submission ${submissionUUID}`,
                commandLine: `/bin/bash -c "sudo /home/adminuser/setup.sh '${response.data.attributes.path}' '${response.data.id}' > /home/adminuser/${submissionUUID}-output.txt 2>&1"`,
                userIdentity: {
                    autoUser: {
                        elevationLevel: 'admin'
                    }
                },
                constraints: {
                    maxTaskRetryCount: 3,
                    maxWallClockTime: 'P1D'
                },
                outputFiles: [
                    {
                        destination: {
                            container: {
                                containerUrl: sasOutputFolderToken,
                                path: `${submissionUUID}.txt`
                            }
                        },
                        filePattern: `/home/adminuser/${submissionUUID}-output.txt`,
                        uploadOptions: {
                            uploadCondition: "taskSuccess"
                        }
                    },
                    {
                        destination: {
                            container: {
                                containerUrl: sasOutputFolderToken,
                                path: `${submissionUUID}.txt`
                            }
                        },
                        filePattern: `/home/adminuser/${submissionUUID}-output.txt`,
                        uploadOptions: {
                            uploadCondition: "taskFailure"
                        }
                    },
                ]
            };

            // Add task to job
            const task = batchClient.task.add('test-submissions', taskConfig, function (error, result) {
                if (error !== null) {
                    console.log("Error occurred while creating task for " + submissionUUID)
                    console.error(error)
                }
                else {
                    console.log("Task for submission : " + submissionUUID + " submitted successfully");
                }
            });
        } catch (err) {
            console.error(err.message)
        }

        return response;
    },
}));
