var { writeLog, getConstants } = require('./utils.js');
var { getCmeGroup } = require('./dataExtractor.js');

var request = require('request');
var path = require('path');

const EXCEPTION_DAYS = ["01/01/2025", "04/20/2025", "12/25/2025", "05/21/2025"]; // Add any other exception days here

// Take the current date-1 and ensure that is not a weekend
let dateToProcess = new Date();
dateToProcess.setDate(dateToProcess.getDate() - 4); // Rest a day
const formattedDateToProcess = `${String(dateToProcess.getMonth() + 1).padStart(2, '0')}/${String(dateToProcess.getDate()).padStart(2, '0')}/${String(dateToProcess.getFullYear())}`;
const parts = formattedDateToProcess.split('/');
const month = parseInt(parts[0], 10) -1; // Los meses en JavaScript son 0-indexados
const day = parseInt(parts[1], 10);
const year = parseInt(parts[2], 10);
const dateToCheck = new Date(year, month, day);
const dayOfWeek = dateToCheck.getDay(); // 0 (Sunday) a 6 (Saturday)
const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

const nowInit = new Date();
const formattedDateInit = `${String(nowInit.getFullYear())}-${String(nowInit.getMonth() + 1).padStart(2, '0')}-${String(nowInit.getDate()).padStart(2, '0')} ${String(nowInit.getHours()).padStart(2, '0')}:${String(nowInit.getMinutes()).padStart(2, '0')}:${String(nowInit.getSeconds()).padStart(2, '0')}`;
var globalConfig = JSON.parse(getConstants());
writeLog(`Start dateTime: ${formattedDateInit}`, "INFO", globalConfig);

if (EXCEPTION_DAYS.includes(formattedDateToProcess) || isWeekend) {
    writeLog(`Date ${formattedDateToProcess} is in exception list or is weekend.`, "INFO", globalConfig);
} else {
    var cmeGruopResult = getCmeGroup(formattedDateToProcess,globalConfig);
    if (cmeGruopResult.statusCode != 200) {
        writeLog(`Error in CmeGroup: code: ${cmeGruopResult.statusCode};description: ${cmeGruopResult.statusDescription}`, "ERROR", globalConfig);
    }else{
        writeLog (`CmeGroup Result: ${JSON.stringify(cmeGruopResult, null, 2)}`, "INFO", globalConfig);
    }
}
const nowEnd = new Date();
const formattedDateEnd = `${String(nowEnd.getFullYear())}-${String(nowEnd.getMonth() + 1).padStart(2, '0')}-${String(nowEnd.getDate()).padStart(2, '0')} ${String(nowEnd.getHours()).padStart(2, '0')}:${String(nowEnd.getMinutes()).padStart(2, '0')}:${String(nowEnd.getSeconds()).padStart(2, '0')}`;
writeLog(`End dateTime: ${formattedDateEnd}`, "INFO", globalConfig);