'use strict'
import * as mqtt from 'mqtt'
import express from 'express'
import { getAdmin, getUser, createUser, showUsers, deleteUser, editUser, insertUsers, findID, getFare, editFare, addTransactionDetails, getUserBySerialNumber, getPendingFeeDetails } from './db/mongo.js'
import { date } from './helpers/date.js'
import { time } from './helpers/time.js'
import * as session from 'express-session'
import * as Razorpay from 'razorpay'
import * as md5 from 'md5'
import * as fileUpload from 'express-fileupload'
import parseXlsx from 'excel'
import { calculateFare } from './helpers/calculateFare.js'
import { sendMsg } from './helpers/sendMsg.js'
import { sendMail } from './helpers/sendEmail.js'
import { createClient } from 'redis'
import { utils, writeFile } from 'xlsx'
import path from 'path'

const redis_client = createClient()
redis_client.on('error', (err) => console.log('Redis Client Error', err))
await redis_client.connect()

const app = express()

let instance = new Razorpay.default({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET
})

// instance.payments.fetch(paymentId)

const PORT = process.env.PORT || 3000

const client = mqtt.connect('mqtt://15.206.80.76', {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD
})

// app.use(cors.default())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(fileUpload.default())
app.use(express.static('public'))

app.use(session.default({
    secret: process.env.SESSION_SECRET,
    cookie: {
        maxAge: 3.6e+6
    },
    resave: true,
    saveUninitialized: true
}))

app.set('view engine', 'hbs')

client.on('connect', () => console.log('connected to mqtt server'))

client.subscribe('rfid/card', (err) => {
    if (err) return err
})

// app.get('/:amt', (req, res) => {
//     client.publish('store/rfid', `${req.params.amt}`)
// })

//test page......
app.get('/test', (req, res) => {
    res.render('test_page')
})


//ADMIN CONTROL

app.use('/admin/*', (req, res, next) => {
    if (req.session.AdminLoggedIn) {
        next()
    } else {
        res.render('admin_login')
    }
})

app.get('/admin/home', (req, res) => {
    return res.redirect('/admin/showUsers')
    // res.render('admin_home', { admin: true })
})

app.get('/admin', (req, res) => {
    if (req.session.AdminLoggedIn) {
        res.redirect('/admin/home')
    } else {
        res.render('admin_login')
    }
})

app.post('/admin', (req, res) => {
    if (req.body.username === '' || req.body.password === '') {
        return res.redirect('/admin')
    }
    getAdmin()
        .then(details => {
            let username = req.body.username
            let password = req.body.password
            let db = details[0]

            if (db.user === username) {
                if (db.pass === md5.default(password)) {
                    req.session.AdminLoggedIn = true
                    // req.session.User = username
                    return res.redirect('/admin/home')
                } else {
                    return res.render('admin_error_login')
                }
            } else {
                return res.render('admin_error_login')
            }
        })
        .catch(err => console.log(err.message))
})

app.get('/admin/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/admin')
})

app.get('/admin/createUser', (req, res) => {
    res.render('admin_createUser', { admin: true })
})

app.post('/admin/createUser', async (req, res) => {
    const user = await getUser(req.body.user)
    if (user.length != 0) {
        return res.send('user already exists')
    }
    createUser({ user: req.body.user, pass: md5.default(req.body.pass), username: req.body.username, serialNumber: req.body.serialNumber, admissionNumber: req.body.admissionNumber, phone: req.body.phone, email: req.body.email, place: req.body.place, balance: 0 })
        .then(() => {
            return res.redirect('/admin/showUsers')
        })
        .catch(err => {
            res.send(err.message)
            console.log(err)
        })
})

app.get('/admin/usernameExists/:user', async (req, res) => {
    const user = await getUser(req.params.user)
    if (user.length != 0) {
        return res.send('user already exists')
    } else {
        return res.sendStatus(500)
    }
})

app.get('/admin/showUsers', (req, res) => {
    showUsers()
        .then(data => {
            return res.render('user_showUsers', { data, admin: true })
        })
})

app.get('/admin/deleteUser/:user/:id', (req, res) => {
    deleteUser({ user: req.params.user, pass: req.params.id })
        .then(() => {
            return res.redirect('/admin/showUsers')
        })
})

app.get('/admin/editUser/:user', (req, res) => {
    getUser(req.params.user)
        .then((data) => {
            return res.render('admin_editUser', { admin: true, data: data[0] })
        })
})

app.post('/admin/editUser', (req, res) => {
    if (req.body.pass.length != 32) req.body.pass = md5.default(req.body.pass)
    editUser({ user: req.body.user, data: req.body })
        .then(() => {
            return res.redirect('/admin/showUsers')
        })
})

app.get('/admin/createUserFile', (req, res) => {
    return res.render('admin_createUserFile', { admin: true })
})

app.post('/admin/createUserFile', async (req, res) => {
    await req.files.spreadsheet.mv('./spreadsheet/spreadsheet.xlsx')
    parseXlsx.default('./spreadsheet/spreadsheet.xlsx')
        .then(async data => {
            const db_data = []
            for (let i = 1; i < data.length; i++) {
                if (data[i][0] === '') continue
                const user = await getUser(data[i][0])
                if (user.length != 0) {
                    continue
                }
                let each_data = { user: data[i][0], pass: md5.default(data[i][1]), username: data[i][2], admissionNumber: data[i][3], serialNumber: data[i][4], phone: data[i][5], email: data[i][6], place: data[i][7], balance: 0 }
                db_data.push(each_data)
            }
            if (db_data.length === 0) return res.redirect('/admin/showUsers')
            insertUsers(db_data)
                .then(() => {
                    return res.redirect('/admin/showUsers')
                })
        })
        .catch(err => console.log(err.message))
})

app.get('/admin/editFare', (req, res) => {
    getFare()
        .then(data => {
            res.render('admin_editFare', { data: data[0], admin: true })
        })
})

app.post('/admin/editFare', (req, res) => {
    editFare(req.body)
        .then(() => {
            res.redirect('/admin/showUsers')
        })
})

app.get('/admin/details', (req, res) => {
    res.render('admin_details', { admin: true })
})

app.get('/admin/getPendingFeeDetails', (req, res) => {
    getPendingFeeDetails()
        .then(data => {
            const temp = []
            data.map(e => {
                temp.push({
                    'Name': e.username,
                    'Admission Number': e.admissionNumber,
                    'Phone': e.phone,
                    'Email': e.email,
                    'Balance': e.balance
                })
            })
            const worksheet = utils.json_to_sheet(temp)
            const workbook = utils.book_new()
            utils.book_append_sheet(workbook, worksheet, 'Details')
            writeFile(workbook, './temp/sheet.xlsx')
            res.sendFile(`${path.resolve()}/temp/sheet.xlsx`)
        })
        .catch(e => console.log(e))
})

//USER CONTROL
app.use('/user/*', (req, res, next) => {
    if (req.session.LoggedIn) {
        next()
    } else {
        res.render('user_login')
    }
})

app.get('/user/home', (req, res) => {
    getUser(req.session.username)
        .then(data => {
            res.render('user_home', { username: `Hi ${req.session.User},`, loggedIn: true, data: data[0] })
        })
})

app.get('/user', (req, res) => {
    res.redirect('/user/home')
})

app.get('/user/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/user')
})

app.get('/user/getBalance', (req, res) => {
    getUser(req.session.username)
        .then(data => {
            return res.json({ balance: data[0].balance })
        })
})

app.post('/user', (req, res) => {
    if (req.body.username === '' || req.body.password === '') {
        return res.redirect('/user')
    }
    getUser(req.body.username)
        .then(details => {
            let username = req.body.username
            let password = req.body.password
            let db = details[0]

            if (details.length === 0) {
                return res.render('user_error_login')
            }

            if (db.user === username) {
                if (db.pass === md5.default(password)) {
                    req.session.LoggedIn = true
                    req.session.User = db.username
                    req.session.username = username
                    return res.redirect('/user/home')
                } else {
                    return res.render('user_error_login')
                }
            } else {
                return res.render('user_error_login')
            }
        })
        .catch(err => console.log(err.message))
})

app.get('/user/showTransactions', (req, res) => {
    getUser(req.session.username)
        .then(data => {
            if (data[0].transactions) {
                return res.render('user_showTransactions', { username: `Hi ${req.session.User},`, data: data[0].transactions.reverse(), loggedIn: true })
            }
            return res.render('user_showTransactions', { username: `Hi ${req.session.User},`, loggedIn: true })
        })
})

app.post('/user/addMoney', (req, res) => {
    getUser(req.session.username)
        .then(data => {
            instance.paymentLink.create({
                "amount": req.body.amt * 100,
                "currency": "INR",
                "accept_partial": false,
                // "first_min_partial_amount": 100,
                "expire_by": 1691097057,
                // "reference_id": "TS1989",
                "description": "Wallet",
                "customer": {
                    "name": data[0].username,
                    "email": data[0].email,
                    "contact": data[0].phone
                },
                "notify": {
                    "sms": false,
                    "email": false
                },
                "reminder_enable": true,
                "notes": {
                    "policy_name": "testing"
                },
                "callback_url": "https://idp-pay.tech/verifyPayment/fd136a11-01fe-4d98-8e60-dc50a16cf51c",
                "callback_method": "get",
                // "upi_link": true
            })
                .then(data => {
                    editUser({ user: req.session.username, data: { reference_id: data.id, requested_amt: req.body.amt } })
                        .then(() => {
                            return res.redirect(data.short_url)
                        })
                })
                .catch(err => {
                    console.log(err)
                    return res.redirect('/user/home')
                })
        })
})

app.get('/verifyPayment/fd136a11-01fe-4d98-8e60-dc50a16cf51c', (req, res) => {
    const id = req.query.razorpay_payment_link_id
    findID(id)
        .then(data => {
            editUser({ user: data[0].user, data: { balance: parseFloat(data[0].balance) + parseFloat(data[0].requested_amt), requested_amt: 0 } })
                .then(() => {
                    addTransactionDetails({ user: data[0].user, transactions: `+₹${data[0].requested_amt} | ${date()} | ${time()}` })
                        .then(() => {
                            sendMsg('Payment Done! Thank you for completing your secure online payment. Have a great day!', data[0].phone)
                                .then((response) => console.log(response))
                                .catch(err => console.log(err))
                            sendMail('Payment Done! Thank you for completing your secure online payment. Have a great day!', data[0].email)
                            return res.render('user_paymentSuccess')
                        })
                        .catch(err => res.send('error'))
                })
                .catch(err => {
                    console.log(err.message)
                    return res.send('ERROR')
                })
        })
})

//testing api
app.get('/test/:id', (req, res) => {
    console.log(req.params.id)
    getUserBySerialNumber(req.params.id)
        .then(async data => {
            let phone = data[0].phone
            if (data[0].status === false) {
                return res.send('Blocked')
            }
            if (data[0].balance <= -500) {
                sendMsg(`Please pay the due amount to enable your card. https://idp-pay.tech`, data[0].phone)
                    .then((response) => console.log(response))
                    .catch(err => console.log(err))
                sendMail(`Please pay the due amount to enable your card. https://idp-pay.tech`, data[0].email)
                    .then((response) => console.log(response))
                    .catch(err => console.log(err))
                return res.send('Blocked')
            }
            let amount = await calculateFare(data[0].place)
            let balance = data[0].balance - amount
            let user = data[0].user
            if (balance < 0) {
                instance.paymentLink.create({
                    "amount": Math.abs(balance) * 100,
                    "currency": "INR",
                    "accept_partial": false,
                    "expire_by": 1691097057,
                    "description": "Insufficient Balance - Wallet",
                    "customer": {
                        "name": data[0].username,
                        "email": data[0].email,
                        "contact": data[0].phone
                    },
                    "notify": {
                        "sms": true,
                        "email": true
                    },
                    "reminder_enable": true,
                    "notes": {
                        "policy_name": "testing"
                    },
                    "callback_url": "https://idp-pay.tech/verifyPayment/fd136a11-01fe-4d98-8e60-dc50a16cf51c",
                    "callback_method": "get",
                    // "upi_link": true
                })
                    .then(data => {
                        console.log(data, balance)
                        editUser({ user, data: { balance: parseFloat(balance), reference_id: data.id, requested_amt: Math.abs(balance) } })
                            .then(() => {
                                addTransactionDetails({ user, transactions: `-₹${amount} | ${date()} | ${time()}` })
                                    .then(() => {
                                        sendMsg(`Your Smart Pay account is debited with INR ${amount} on ${date()} at ${time()}. Please pay the outstanding amount. ${data.short_url}`, phone)
                                            .then((response) => console.log(response))
                                            .catch(err => console.log(err))
                                        sendMail(`Your Smart Pay account is debited with INR ${amount} on ${date()} at ${time()}. https://idp-pay.tech`, data[0].email)
                                            .then((response) => console.log(response))
                                            .catch(err => console.log(err))
                                        return res.send('ok')
                                    })
                            })
                    })
                    .catch(err => console.log(err))
            } else {
                editUser({ user, data: { balance: parseFloat(balance) } })
                    .then((details) => {
                        console.log(details)
                        addTransactionDetails({ user, transactions: `-₹${amount} | ${date()} | ${time()}` })
                            .then(() => {
                                sendMsg(`Your Smart Pay account is debited with INR ${amount} on ${date()} at ${time()}. https://idp-pay.tech`, data[0].phone)
                                    .then((response) => console.log(response))
                                    .catch(err => console.log(err))
                                sendMail(`Your Smart Pay account is debited with INR ${amount} on ${date()} at ${time()}. https://idp-pay.tech`, data[0].email)
                                    .then((response) => console.log(response))
                                    .catch(err => console.log(err))
                                return res.send('ok')
                            })
                            .catch(err => res.send('error'))
                    })
                    .catch(err => {
                        console.log(err.message)
                        return res.send('ERROR')
                    })
            }
        })
        .catch(() => res.send('err'))
})

//card status
app.get('/user/getDisableStatus', (req, res) => {
    getUser(req.session.username)
        .then(data => {
            if (data[0].status === undefined) {
                return res.send(true)
            } else {
                return res.send(data[0].status)
            }
        })
})

app.get('/user/disable', (req, res) => {
    editUser({ user: req.session.username, data: { status: false } })
        .then(() => {
            getUser(req.session.username)
                .then(data => {
                    sendMail('Your account has been disabled', data[0].email)
                    sendMsg('Your account has been disabled', data[0].phone)
                })
            res.send('ok')
        })
})

app.get('/user/enable', (req, res) => {
    getUser(req.session.username)
        .then(data => {
            if (data[0].balance <= -500) {
                return res.send('blocked')
            }
            editUser({ user: req.session.username, data: { status: true } })
                .then(() => {
                    sendMail('Your account has been enabled', data[0].email)
                    sendMsg('Your account has been enabled', data[0].phone)
                    res.send('ok')
                })
        })
})

//HANDLE 404
app.get('*', (req, res) => {
    res.render('404')
})

//MQTT 
client.on('message', async (topic, message) => {
    const serialNumber = message.toString().split(' ').join(':').slice(1,)
    console.log(`serial number is => ${serialNumber}`)
    if (await redis_client.get(serialNumber) != null) {
        return client.publish('rfid/response', 'PAID')
    }
    getUserBySerialNumber(serialNumber)
        .then(async data => {
            redis_client.set(serialNumber, 'rfid', {
                EX: 60
            })
            let phone = data[0].phone
            if (data[0].status === false) {
                return client.publish('rfid/response', 'BLOCKED')
            }
            if (data[0].balance <= -500) {
                sendMsg(`Please pay the due amount to enable your card. https://idp-pay.tech`, data[0].phone)
                    .then((response) => console.log(response))
                    .catch(err => console.log(err))
                sendMail(`Please pay the due amount to enable your card. https://idp-pay.tech`, data[0].email)
                    .then((response) => console.log(response))
                    .catch(err => console.log(err))
                return client.publish('rfid/response', 'BLOCKED')
            }
            let amount = await calculateFare(data[0].place)
            let balance = data[0].balance - amount
            let user = data[0].user
            if (balance < 0) {
                instance.paymentLink.create({
                    "amount": Math.abs(balance) * 100,
                    "currency": "INR",
                    "accept_partial": false,
                    "expire_by": 1691097057,
                    "description": "Insufficient Balance - Wallet",
                    "customer": {
                        "name": data[0].username,
                        "email": data[0].email,
                        "contact": data[0].phone
                    },
                    "notify": {
                        "sms": true,
                        "email": true
                    },
                    "reminder_enable": true,
                    "notes": {
                        "policy_name": "testing"
                    },
                    "callback_url": "https://idp-pay.tech/verifyPayment/fd136a11-01fe-4d98-8e60-dc50a16cf51c",
                    "callback_method": "get",
                    // "upi_link": true
                })
                    .then(data => {
                        console.log(data, balance)
                        editUser({ user, data: { balance: parseFloat(balance), reference_id: data.id, requested_amt: Math.abs(balance) } })
                            .then(() => {
                                addTransactionDetails({ user, transactions: `-₹${amount} | ${date()} | ${time()}` })
                                    .then(() => {
                                        sendMsg(`Your Smart Pay account is debited with INR ${amount} on ${date()} at ${time()}. Please pay the outstanding amount. ${data.short_url}`, phone)
                                            .then((response) => console.log(response))
                                            .catch(err => console.log(err))
                                        sendMail(`Your Smart Pay account is debited with INR ${amount} on ${date()} at ${time()}. https://idp-pay.tech`, data[0].email)
                                            .then((response) => console.log(response))
                                            .catch(err => console.log(err))
                                        return client.publish('rfid/response', 'SUCCESS')
                                    })
                            })
                    })
                    .catch(err => console.log(err))
            } else {
                editUser({ user, data: { balance: parseFloat(balance) } })
                    .then((details) => {
                        console.log(details)
                        addTransactionDetails({ user, transactions: `-₹${amount} | ${date()} | ${time()}` })
                            .then(() => {
                                sendMsg(`Your Smart Pay account is debited with INR ${amount} on ${date()} at ${time()}. https://idp-pay.tech`, data[0].phone)
                                    .then((response) => console.log(response))
                                    .catch(err => console.log(err))
                                sendMail(`Your Smart Pay account is debited with INR ${amount} on ${date()} at ${time()}. https://idp-pay.tech`, data[0].email)
                                    .then((response) => console.log(response))
                                    .catch(err => console.log(err))
                                return client.publish('rfid/response', 'SUCCESS')
                            })
                            .catch(err => {
                                console.log(err)
                                client.publish('rfid/response', 'ERROR_1')
                            })
                    })
                    .catch(err => {
                        console.log(err.message)
                        client.publish('rfid/response', 'ERROR_2')
                    })
            }
        })
        .catch(() => {
            console.log('Card Invalid')
            client.publish('rfid/response', 'Invalid Request')
        })
})

client.on('error', (err) => console.log(err.message))

const server = app.listen(PORT, () => console.log(`Listening on PORT => ${PORT}`))
process.on('uncaughtException', () => server.close());
process.on('SIGTERM', () => server.close());
process.on('exit', () => server.close());


