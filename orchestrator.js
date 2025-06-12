var { writeLog, getConstants } = require('./utils.js');
var { getCmeGroupChicago, getCmeGroupNY, getCmeGroupT2, getCmeGroupCorn, getCmeGroupRbob, getCmeGroupSugar11 } = require('./dataExtractor.js');
var { excelSave } = require('./drivers.js');

var request = require('request');
var path = require('path');

const EXCEPTION_DAYS = ["01/01/2025", "04/20/2025", "12/25/2025", "05/21/2025"]; // Add any other exception days here
const USE_API_DATA = false; // Set to false if you want to use local data instead of API calls

// ERROR: Ver la fecha, que cuando se pasa creo que no funciona bien
function globalOrchestrator(date,globalConfig) {
    // Take the current date-1 and ensure that is not a weekend
    let dateToProcess = new Date();
    dateToProcess.setDate(dateToProcess.getDate() - 1); // Rest a day
    const formattedDateToProcess = `${String(dateToProcess.getMonth() + 1).padStart(2, '0')}/${String(dateToProcess.getDate()).padStart(2, '0')}/${String(dateToProcess.getFullYear())}`;
    const parts = formattedDateToProcess.split('/');
    const month = parseInt(parts[0], 10) - 1; // Los meses en JavaScript son 0-indexados
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const dateToCheck = new Date(year, month, day);
    const dayOfWeek = dateToCheck.getDay(); // 0 (Sunday) a 6 (Saturday)
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

    const nowInit = new Date();
    const formattedDateInit = `${String(nowInit.getFullYear())}-${String(nowInit.getMonth() + 1).padStart(2, '0')}-${String(nowInit.getDate()).padStart(2, '0')} ${String(nowInit.getHours()).padStart(2, '0')}:${String(nowInit.getMinutes()).padStart(2, '0')}:${String(nowInit.getSeconds()).padStart(2, '0')}`;
    // var globalConfig = JSON.parse(getConstants());
    var excelData = {};
    writeLog(`Start at: ${formattedDateInit}`, "INFO", globalConfig);

    if (EXCEPTION_DAYS.includes(formattedDateToProcess) || isWeekend) {
        writeLog(`Date ${formattedDateToProcess} is in exception list or is weekend.`, "INFO", globalConfig);
    } else {
        //Getting NYH info
        var cmeGruopResultCu = getCmeGroupChicago(formattedDateToProcess, globalConfig);
        if (cmeGruopResultCu.statusCode != 200) {
            writeLog(`Error in CmeGroup Chicago: code: ${cmeGruopResultCu.statusCode};description: ${cmeGruopResultCu.statusDescription}`, "ERROR", globalConfig);
        } else {
            writeLog(`CmeGroup Chicago resume: ${JSON.stringify(cmeGruopResultCu, null, 2)}`, "DEBUG", globalConfig);
        }
        excelData.CU = {};
        excelData.CU.data = cmeGruopResultCu.data.lineInfo;
        excelData.CU.tmp = cmeGruopResultCu.data.lineTmp;
        excelData.CU.resume = cmeGruopResultCu.data.resume;

        //Getting NYH info
        var cmeGruopResultNyh = getCmeGroupNY(formattedDateToProcess, globalConfig);
        if (cmeGruopResultNyh.statusCode != 200) {
            writeLog(`Error in CmeGroup New York: code: ${cmeGruopResultNyh.statusCode};description: ${cmeGruopResultNyh.statusDescription}`, "ERROR", globalConfig);
        } else {
            writeLog(`CmeGroup New York resume: ${JSON.stringify(cmeGruopResultNyh, null, 2)}`, "DEBUG", globalConfig);
        }
        excelData.NYH = {};
        excelData.NYH.data = cmeGruopResultNyh.data.lineInfo;
        excelData.NYH.tmp = cmeGruopResultNyh.data.lineTmp;
        excelData.NYH.resume = cmeGruopResultNyh.data.resume;

        //Getting T2 info
        var cmeGruopResultT2 = getCmeGroupT2(formattedDateToProcess, globalConfig);
        if (cmeGruopResultT2.statusCode != 200) {
            writeLog(`Error in CmeGroup New York: code: ${cmeGruopResultT2.statusCode};description: ${cmeGruopResultT2.statusDescription}`, "ERROR", globalConfig);
        } else {
            writeLog(`CmeGroup New York resume: ${JSON.stringify(cmeGruopResultT2, null, 2)}`, "DEBUG", globalConfig);
        }
        excelData.T2 = {};
        excelData.T2.data = cmeGruopResultT2.data.lineInfo;
        excelData.T2.tmp = cmeGruopResultT2.data.lineTmp;
        excelData.T2.resume = cmeGruopResultT2.data.resume;
    }

    //Getting CORN info
    var cmeGruopResultCorn = getCmeGroupCorn(formattedDateToProcess, globalConfig);
    if (cmeGruopResultCorn.statusCode != 200) {
        writeLog(`Error in CmeGroup Corn: code: ${cmeGruopResultCorn.statusCode};description: ${cmeGruopResultCorn.statusDescription}`, "ERROR", globalConfig);
    } else {
        writeLog(`CmeGroup Corn resume: ${JSON.stringify(cmeGruopResultCorn, null, 2)}`, "DEBUG", globalConfig);
    }
    excelData.CORN = {};
    excelData.CORN.data = cmeGruopResultCorn.data.lineInfo;
    excelData.CORN.tmp = cmeGruopResultCorn.data.lineTmp;
    excelData.CORN.resume = cmeGruopResultCorn.data.resume;

    //Getting RBOB info
    var cmeGruopResultCorn = getCmeGroupRbob(formattedDateToProcess, globalConfig);
    if (cmeGruopResultCorn.statusCode != 200) {
        writeLog(`Error in CmeGroup RBob: code: ${cmeGruopResultCorn.statusCode};description: ${cmeGruopResultCorn.statusDescription}`, "ERROR", globalConfig);
    } else {
        writeLog(`CmeGroup RBob resume: ${JSON.stringify(cmeGruopResultCorn, null, 2)}`, "DEBUG", globalConfig);
    }
    excelData.RBOB = {};
    excelData.RBOB.data = cmeGruopResultCorn.data.lineInfo;
    excelData.RBOB.tmp = cmeGruopResultCorn.data.lineTmp;
    excelData.RBOB.resume = cmeGruopResultCorn.data.resume;

    //Getting SUGAR 11 info
    var cmeGruopResultCorn = getCmeGroupSugar11(formattedDateToProcess, globalConfig);
    if (cmeGruopResultCorn.statusCode != 200) {
        writeLog(`Error in CmeGroup Sugar 11: code: ${cmeGruopResultCorn.statusCode};description: ${cmeGruopResultCorn.statusDescription}`, "ERROR", globalConfig);
    } else {
        writeLog(`CmeGroup Sugar 11 resume: ${JSON.stringify(cmeGruopResultCorn, null, 2)}`, "DEBUG", globalConfig);
    }
    excelData.Sugar_11 = {};
    excelData.Sugar_11.data = cmeGruopResultCorn.data.lineInfo;
    excelData.Sugar_11.tmp = cmeGruopResultCorn.data.lineTmp;
    excelData.Sugar_11.resume = cmeGruopResultCorn.data.resume;

    if (USE_API_DATA) {
        var excelData = {
            CU: {
                data: [
                    {
                        date: "23/5/2025",
                        volume: "1,725",
                        month1: "1,73750",
                        month2: "1,78500",
                        month3: "1,80000",
                        month4: "1,79250",
                        month5: "1,77500",
                        month6: "1,73500",
                        month7: "1,69750",
                        month8: "1,67250",
                        month9: "1,65750",
                        month10: "1,66500",
                        month11: "1,68000",
                        month12: "1,70250",
                        month13: "1,71250",
                        month14: "1,71750",
                    },
                ],
                tmp: [
                    {
                        date: "${table:CU.date}",
                        volume: "${table:CU.volume}",
                        month1: "${table:CU.month1}",
                        month2: "${table:CU.month2}",
                        month3: "${table:CU.month3}",
                        month4: "${table:CU.month4}",
                        month5: "${table:CU.month5}",
                        month6: "${table:CU.month6}",
                        month7: "${table:CU.month7}",
                        month8: "${table:CU.month8}",
                        month9: "${table:CU.month9}",
                        month10: "${table:CU.month10}",
                        month11: "${table:CU.month11}",
                        month12: "${table:CU.month12}",
                        month13: "${table:CU.month13}",
                        month14: "${table:CU.month14}",
                    },
                ],
                resume: [
                    {
                        date: "2025-05-28 15:01:02",
                        tradeDate: "05/23/2025",
                        origin: "CMEGroup Chicago-CU",
                        amount: 14,
                    },
                ],
            },
            NYH: {
                data: [
                    {
                        date: "23/5/2025",
                        volume: "1,725",
                        month1: "1,73750",
                        month2: "1,78500",
                        month3: "1,80000",
                        month4: "1,79250",
                        month5: "1,77500",
                        month6: "1,73500",
                        month7: "1,69750",
                        month8: "1,67250",
                        month9: "1,65750",
                        month10: "1,66500",
                        month11: "1,68000",
                        month12: "1,70250",
                        month13: "1,71250",
                        month14: "1,71750",
                    },
                ],
                tmp: [
                    {
                        date: "${table:NYH.date}",
                        volume: "${table:NYH.volume}",
                        month1: "${table:NYH.month1}",
                        month2: "${table:NYH.month2}",
                        month3: "${table:NYH.month3}",
                        month4: "${table:NYH.month4}",
                        month5: "${table:NYH.month5}",
                        month6: "${table:NYH.month6}",
                        month7: "${table:NYH.month7}",
                        month8: "${table:NYH.month8}",
                        month9: "${table:NYH.month9}",
                        month10: "${table:NYH.month10}",
                        month11: "${table:NYH.month11}",
                        month12: "${table:NYH.month12}",
                        month13: "${table:NYH.month13}",
                        month14: "${table:NYH.month14}",
                    },
                ],
                resume: [
                    {
                        date: "2025-05-28 15:01:07",
                        tradeDate: "05/23/2025",
                        origin: "CMEGroup New york-NYH",
                        amount: 5,
                    },
                ],
            },
        };
    }

    var result = excelSave(excelData, __dirname, globalConfig);

    const nowEnd = new Date();
    const formattedDateEnd = `${String(nowEnd.getFullYear())}-${String(nowEnd.getMonth() + 1).padStart(2, '0')}-${String(nowEnd.getDate()).padStart(2, '0')} ${String(nowEnd.getHours()).padStart(2, '0')}:${String(nowEnd.getMinutes()).padStart(2, '0')}:${String(nowEnd.getSeconds()).padStart(2, '0')}`;
    writeLog(`End at: ${formattedDateEnd}`, "INFO", globalConfig);
}

module.exports = {
    globalOrchestrator
};