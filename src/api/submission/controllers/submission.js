'use strict';

// Require libraries
const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require("@azure/storage-blob")
const { BatchServiceClient, BatchSharedKeyCredentials } = require("@azure/batch")
const { v4: uuidv4 } = require('uuid');
const fs = require('fs')
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

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

function sendEmail(type, submission) {

    let data = {},
        template = null

    switch (type) {
        case 'submission':
            template = 'd-0d6383f26a5046b6b9b72546426f4910'
            data = {
                title: submission.attributes.title
            }
            break;
        case 'output':

            const outputContainerName = 'outputs'
            const outputContainerClient = storageClient.getContainerClient(outputContainerName)
            const blobName = submission.attributes.uuid + '.txt'
            const blockBlobClient = outputContainerClient.getBlockBlobClient(blobName)

            // Create expiry date one year in the future
            let expiry =  new Date();
            expiry.setFullYear(new Date().getFullYear() + 1)

            // Generate SAS token
            const sasToken = generateBlobSASQueryParameters({
                containerName: outputContainerName,
                blobName: blobName,
                expiresOn: expiry,
                permissions: BlobSASPermissions.parse("r")
            }, storageCredentials)

            template = 'd-0dc8686815744df48bce83201172cffe'
            data = {
                title: submission.attributes.title,
                outputUrl: `${blockBlobClient.url}?${sasToken}`
            }
            break;
    }

    const msg = {
        to: submission.attributes.user_email, // Change to your recipient
        from: 'info@nascompetition.com', // Change to your verified sender
        templateId: template,
        dynamicTemplateData: data
      }
      sgMail
        .send(msg)
        .then((response) => {
          console.log(response)
        })
        .catch((error) => {
          console.error(error)
        })
}

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
                    maxWallClockTime: 'P1H'
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
                    sendEmail('submission', response.data)
                }
            });
        } catch (err) {
            console.error(err.message)
        }

        return response;
    },
    async update(ctx) {

        const result = await super.update(ctx);
        sendEmail('output', result.data)

        return result;
    }
}));
