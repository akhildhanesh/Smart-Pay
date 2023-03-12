'use strict'

let date = () => {
    let d = new Date()
    let month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    let month_name = month[d.toLocaleString('en-US', { timeZone: "Asia/Kolkata" }).split('/')[0] - 1]
    let day = d.toLocaleString('en-US', { timeZone: "Asia/Kolkata" }).split('/')[1]
    let year = d.toLocaleString('en-US', { timeZone: "Asia/Kolkata" }).split('/')[2].slice(0, 4)

    return `${day} ${month_name} ${year}`
}

export {
    date
}