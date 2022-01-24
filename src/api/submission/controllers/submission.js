'use strict';

// Initializing Azure Batch variables

// import { BatchServiceClient, BatchSharedKeyCredentials } from "@azure/batch";
const { BatchServiceClient, BatchSharedKeyCredentials } = require("@azure/batch")

const batchAccountName = process.env.BATCH_ACCOUNT_NAME,
      batchAccountKey = process.env.BATCH_ACCOUNT_KEY,
      batchEndpoint = process.env.BATCH_ENDPOINT

const credentials = new BatchSharedKeyCredentials(batchAccountName, batchAccountKey)
const batchClient = new BatchServiceClient(credentials, batchEndpoint)

/**
 *  submission controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::submission.submission', ({strapi}) => ({
    async create(ctx) {
        console.log(ctx.request.body.data)
        const response = await super.create(ctx);
        console.log(response)
        const submissionId = ctx.request.body.data.sub_id
        const jobId = 'test-submissions'

        // Task configuration object
        const taskConfig = {
            id: `${submissionId}_process`,
            displayName: `process submission ${submissionId}`,
            commandLine: `./setup.sh ${ctx.request.body.data.path}`,
        };

        const task = batchClient.task.add(jobId, taskConfig, function (error, result) {
            if (error !== null) {
                console.log("Error occurred while creating task for " + submissionId + ". Details : " + error.response);
            }
            else {
                console.log("Task for submission : " + submissionId + " submitted successfully");
            }
        });

        return response;
    },
}));
