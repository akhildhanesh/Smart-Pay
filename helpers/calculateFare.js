'use strict'

import { getFare } from '../db/mongo.js'

let calculateFare = (place) => {
    return new Promise(async (resolve, reject) => {
        let fares = await getFare()
        resolve(parseInt(fares[0][place] / 182.5))
    })
}

export {
    calculateFare
}