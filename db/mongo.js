'use strict'

import { MongoClient } from 'mongodb'
const url = 'mongodb://127.0.0.1:27017/';
const client = new MongoClient(url);

const dbName = 'students';
const db = client.db(dbName)
const collection = db.collection('sno')
const admin_collection = db.collection('admin')
const user_collection = db.collection('user')
const fare_table = db.collection('fare')


async function main() {
    await client.connect();
    return 'DataBase Connected';
}

main()
    .then(console.log)
    .catch(console.error)

let getStudent = (email, password) => {
    return new Promise(async (resolve, reject) => {
        const result = await collection.find({ email, password }).toArray()
        if (result.length === 0) {
            reject('No record found')
        } else {
            resolve(result[0])
        }
    })
}

let getStudentRecord = (email) => {
    return new Promise(async (resolve, reject) => {
        const result = await collection.find({ email }).toArray()
        if (result.length === 0) {
            reject('No record found')
        } else {
            resolve(result[0])
        }
    })
}

let getAdmin = () => {
    return new Promise(async (resolve, reject) => {
        let details = await admin_collection.find().toArray()
        resolve(details)
    })
}

let getUser = (username) => {
    return new Promise(async (resolve, reject) => {
        let details = await user_collection.find({ user: username }).toArray()
        resolve(details)
    })
}

let createUser = (data) => {
    return new Promise(async (resolve, reject) => {
        let details = await user_collection.insertOne(data)
        resolve(details)
    })
}

let showUsers = () => {
    return new Promise(async (resolve, reject) => {
        let details = await user_collection.find().toArray()
        resolve(details)
    })
}

let deleteUser = ({ user, pass }) => {
    return new Promise(async (resolve, reject) => {
        let details = await user_collection.deleteOne({ user, pass })
        resolve(details)
    })
}

let editUser = ({ user, data }) => {
    return new Promise(async (resolve, reject) => {
        let details = await user_collection.updateOne({ user }, { $set: { ...data } })
        if (details.length != 0) {
            resolve(details)
        } else {
            reject()
        }
    })
}

let insertUsers = (data) => {
    return new Promise(async (resolve, reject) => {
        let details = await user_collection.insertMany(data)
        resolve(details)
    })
}

let findID = (id) => {
    return new Promise(async (resolve, reject) => {
        let details = await user_collection.find({ reference_id: id }).toArray()
        resolve(details)
    })
}

let getFare = () => {
    return new Promise(async (resolve, reject) => {
        let details = await fare_table.find().toArray()
        resolve(details)
    })
}

let editFare = (data) => {
    return new Promise((resolve, reject) => {
        fare_table.deleteMany({})
            .then(() => {
                console.log(data)
                fare_table.insertOne(data)
                    .then(() => resolve())
            })
            .catch(err => console.log(err.message))
    })
}

let addTransactionDetails = ({ user, transactions }) => {
    return new Promise((resolve, reject) => {
        user_collection.updateOne({ user }, { $push: { transactions } })
            .then(() => resolve())
    })
}

let getUserBySerialNumber = (serialNumber) => {
    return new Promise(async (resolve, reject) => {
        let details = await user_collection.find({ serialNumber }).toArray()
        resolve(details)
    })
}

let getPendingFeeDetails = () => {
    return new Promise(async (resolve, reject) => {
        let details = await user_collection.find({ balance: { $lt: 0 } }).toArray()
        resolve(details)
    })
}

export {
    getStudent,
    getStudentRecord,
    getAdmin,
    getUser,
    createUser,
    showUsers,
    deleteUser,
    editUser,
    insertUsers,
    findID,
    getFare,
    editFare,
    addTransactionDetails,
    getUserBySerialNumber,
    getPendingFeeDetails
}