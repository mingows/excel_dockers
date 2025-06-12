var { writeLog, getConstants } = require('./utils.js');
var { getCmeGroup } = require('./dataExtractor.js');


var request = require('request');
var path = require('path');

const nowInit = new Date();
const formattedDateInit = `${String(nowInit.getFullYear())}-${String(nowInit.getMonth() + 1).padStart(2, '0')}-${String(nowInit.getDate()).padStart(2, '0')} ${String(nowInit.getHours()).padStart(2, '0')}:${String(nowInit.getMinutes()).padStart(2, '0')}:${String(nowInit.getSeconds()).padStart(2, '0')}`;
var globalConfig = JSON.parse(getConstants());
writeLog(`Start dateTime: ${formattedDateInit}`, "INFO", globalConfig);

var cmeGruopResult = getCmeGroup("05/20/2025",globalConfig);
if (cmeGruopResult.statusCode != 200) {
    //console.log("Error en la respuesta de CmeGroup");
    writeLog(`Error in CmeGroup: code: ${cmeGruopResult.statusCode};description: ${cmeGruopResult.statusDescription}`, "ERROR", globalConfig);
    //process.exit(1);
}else{
    writeLog (`CmeGroup Result: ${JSON.stringify(cmeGruopResult, null, 2)}`, "INFO", globalConfig);
}

const nowEnd = new Date();
const formattedDateEnd = `${String(nowEnd.getFullYear())}-${String(nowEnd.getMonth() + 1).padStart(2, '0')}-${String(nowEnd.getDate()).padStart(2, '0')} ${String(nowEnd.getHours()).padStart(2, '0')}:${String(nowEnd.getMinutes()).padStart(2, '0')}:${String(nowEnd.getSeconds()).padStart(2, '0')}`;
writeLog(`End dateTime: ${formattedDateEnd}`, "INFO", globalConfig);