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

let sendMail = (message, email) => {
    let params = {
        Destination: {
            ToAddresses: [
                email,
            ]
        },
        Message: {
            Body: {
                Html: {
                    Charset: "UTF-8",
                    Data: `<p>Dear User,<p/><br><h3>${message}<h3/><br><img src='https://idp-pay.tech/images/icon.png' height='30px' width='30px'><br><p>This is an auto-generated e-mail. Please do not reply.<p/>`
                },
                Text: {
                    Charset: "UTF-8",
                    Data: `${message}`
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: 'Transactional Alert'
            }
        },
        Source: 'SMART PAY <no-reply@idp-pay.tech>',
        ReplyToAddresses: [
            'no-reply@idp-pay.tech',
        ],
    };

    let sendPromise = new AWS.default.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise()

    return sendPromise
}

export {
    sendMail
}