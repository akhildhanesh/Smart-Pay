'use strict'

let time = () => {
    let d = new Date();
    d = d.toLocaleTimeString('en-US', { timeZone: "Asia/Kolkata" })
    let hr = d.split(':')[0]
    let min = d.split(':')[1]
    let ampm = d.split(' ')[1]

    return `${hr}:${min} ${ampm}`
}

export {
    time
}