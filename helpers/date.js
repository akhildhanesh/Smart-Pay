'use strict'

let date = () => {
    let d = new Date()
    d = d.toLocaleString('en-US', { timeZone: "Asia/Kolkata" }).split('/')
    let month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    let month_name = month[d[0] - 1]
    let day = d[1]
    let year = d[2].slice(0, 4)

    return `${day} ${month_name} ${year}`
}

export {
    date
}