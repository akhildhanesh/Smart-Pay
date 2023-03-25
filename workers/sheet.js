import { parentPort, workerData } from 'node:worker_threads'
import { utils, writeFile } from 'xlsx'

const createFile = () => {
    const worksheet = utils.json_to_sheet(workerData.tempData)
    const workbook = utils.book_new()
    utils.book_append_sheet(workbook, worksheet, 'Details')
    return writeFile(workbook, './temp/sheet.xlsx')
}

parentPort.postMessage(createFile())