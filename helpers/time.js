'use strict'

let time = () => {
    let d = new Date();

    let hr = d.toLocaleTimeString('en-US', { timeZone: "Asia/Kolkata" }).split(':')[0]
    let min = d.toLocaleTimeString('en-US', { timeZone: "Asia/Kolkata" }).split(':')[1]
    let ampm = d.toLocaleTimeString('en-US', { timeZone: "Asia/Kolkata" }).split(' ')[1]

    return hr + ':' + min + ' ' + ampm
}

export {
    time
}