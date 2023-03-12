'use strict'

import * as AWS from 'aws-sdk'
import dotenv from 'dotenv'
dotenv.config()

AWS.default.config.update({
    region: 'ap-south-1',
    apiVersion: 'latest',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
})

let sendMsg = (msg, phone) => {
    let params = {
        Message: msg,
        PhoneNumber: `+91${phone}`,
    };

    let publishTextPromise = new AWS.default.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();

    return publishTextPromise
}

export {
    sendMsg
}