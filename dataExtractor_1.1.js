var { writeFile, writeLog, englishDateValidation, orderSettlementsByMonth } = require('./utils.js');
var request = require('request');
var path = require('path');

const prompt = require('prompt-sync')();


//Gets CMEGroup data from Chicago
function getCmeGroupChicago(date, globalConfig) {
    if (!date) {
        const nowEnd = new Date();
        const formattedDateEnd = `${String(nowEnd.getMonth() + 1).padStart(2, '0')}/${String(nowEnd.getDate()).padStart(2, '0')}/${String(nowEnd.getFullYear())}`;
    } else{
        if (englishDateValidation(date) == false) {
            writeLog(`Error: date format is not valid: ${date}`, "ERROR", globalConfig);
            return {
                "statusCode": 400,
                "statusDescription": "Wrong date format. Expected format: MM/DD/YYYY"
            }
        }
    }
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    }
    var request = require('sync-request');
    var options = {
        'method': 'GET',
        'url': 'https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/4708/FUT?strategy=DEFAULT&tradeDate='+date+'&pageSize=500&isProtected&_t=1747732336411',
        'headers': {
            'accept': 'application/json',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6',
        },
        gzip: true, // Solicita y maneja descompresión gzip
        json: true   // Parsea automáticamente la respuesta como JSON
    };
    try {
        var response = request(options.method, options.url, {
            headers: options.headers,
            body: options.body
        });
        var responseBody = JSON.parse(response.getBody('utf8'));
        //If the result is empty, we must to request for the day before until there is a data
        if (responseBody.empty === true) {
            writeLog (`No data found for date: ${date}`, "WARN", globalConfig);
            let dateToProcess = new Date(date);
            dateToProcess.setDate(dateToProcess.getDate() - 1);
            const formattedDateToProcess = `${String(dateToProcess.getMonth() + 1).padStart(2, '0')}/${String(dateToProcess.getDate()).padStart(2, '0')}/${String(dateToProcess.getFullYear())}`;
            var newResult=getCmeGroupChicago(formattedDateToProcess, globalConfig);
            return newResult;
        }
        //Manage the results
        var settlementsOrder = [];
        settlementsOrder = orderSettlementsByMonth(responseBody.settlements);
        const currentTDate = new Date();
        const currentTradeDate = `${String(currentTDate.getDate()).padStart(2, '0')}/${String(currentTDate.getMonth() + 1).padStart(2, '0')}/${String(currentTDate.getFullYear())}`;
        var lineInfo = {
            date: currentTradeDate, // Format as dd/mm/yyyy for Excel compatibility
            volume: 9999
        };
        var lineTmp = {
            date: "${table:CU.date}",
            volume: "${table:CU.volume}"
        };
        var index = 0;
        for (const settlement of settlementsOrder) {    
            if (settlement.month.toUpperCase() != "TOTAL"){
                lineInfo[`month${index + 1}`] = settlement.settle.replace('.', ',');
                lineTmp[`month${index + 1}`] = "${table:CU.month" + (index + 1) + "}";
            } else {
                lineInfo.volume=settlement.volume.replace('.', ',');
                lineInfo.date = currentTradeDate; // Format as dd/mm/yyyy for Excel compatibility
            }
            index++;
        }
        var dataLineInfo=[];
        var dataLineTmp=[];
        dataLineInfo.push(lineInfo);
        dataLineTmp.push(lineTmp);
        //Settlement resume
        const currentDate = new Date();
        const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
        var settlementResume = {
            "date": formattedCurrentDate,
            "tradeDate": responseBody.tradeDate,
            "origin": "CMEGroup Chicago-CU",
            "amount": responseBody.settlements.length-1 // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data={};
        result.data.lineInfo = dataLineInfo;
        result.data.lineTmp = dataLineTmp;
        result.data.resume = dataLineResume;
        writeFile(__dirname + "\\tmp\\cmegroup-chicago-cu.json", JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    } catch (error) {
        writeLog(`Error on the CMEGroup-Chicago request: ${error}`, "ERROR", globalConfig);
        const nowF = new Date();
        const formattedDateF = nowF.toLocaleString();
        writeLog(`Ends at: ${formattedDateF}`, "INFO", globalConfig);
        result.statusCode = "500";
        result.statusDescription = error.message;
        const currentDate = new Date();
        const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
        var settlementResume = {
            "date": formattedCurrentDate,
            "tradeDate": "Unknown", // No trade date available due to error
            "origin": "CMEGroup Chicago-CU",
            "amount": "ERROR" // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data={};
        result.data.lineInfo = [];
        result.data.lineTmp = [];
        result.data.resume = dataLineResume;
        writeFile(__dirname + "\\tmp\\cmegroup-chicago-cu.json", JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    }
}

//Gets CMEGroup data from NY
function getCmeGroupNY(date, globalConfig) {
    if (!date) {
        const nowEnd = new Date();
        const formattedDateEnd = `${String(nowEnd.getMonth() + 1).padStart(2, '0')}/${String(nowEnd.getDate()).padStart(2, '0')}/${String(nowEnd.getFullYear())}`;
    } else{
        if (englishDateValidation(date) == false) {
            writeLog(`Error: date format is not valid: ${date}`, "ERROR", globalConfig);
            return {
                "statusCode": 400,
                "statusDescription": "Wrong date format. Expected format: MM/DD/YYYY"
            }
        }
    }
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    }
    var request = require('sync-request');
    var options = {
        'method': 'GET',
        'url': 'https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/4759/FUT?strategy=DEFAULT&tradeDate='+date+'&pageSize=500&isProtected&_t=1748329926274',
        'headers': {
            'accept': 'application/json',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6',
        },
        gzip: true, // Solicita y maneja descompresión gzip
        json: true   // Parsea automáticamente la respuesta como JSON
    };
    try {
        var response = request(options.method, options.url, {
            headers: options.headers,
            body: options.body
        });
        var responseBody = JSON.parse(response.getBody('utf8'));
        //If the result is empty, we must to request for the day before until there is a data
        if (responseBody.empty === true) {
            writeLog (`No data found for date: ${date}`, "WARN", globalConfig);
            let dateToProcess = new Date(date);
            dateToProcess.setDate(dateToProcess.getDate() - 1);
            const formattedDateToProcess = `${String(dateToProcess.getMonth() + 1).padStart(2, '0')}/${String(dateToProcess.getDate()).padStart(2, '0')}/${String(dateToProcess.getFullYear())}`;
            var newResult=getCmeGroupNY(formattedDateToProcess, globalConfig);
            return newResult;
        }
        //Manage the results
        var settlementsOrder = [];
        settlementsOrder = orderSettlementsByMonth(responseBody.settlements);
        const currentTDate = new Date();
        const currentTradeDate = `${String(currentTDate.getDate()).padStart(2, '0')}/${String(currentTDate.getMonth() + 1).padStart(2, '0')}/${String(currentTDate.getFullYear())}`;
        var lineInfo = {
            date: currentTradeDate, // Format as dd/mm/yyyy for Excel compatibility
            volume: 9999
        };
        var lineTmp = {
            date: "${table:NYH.date}",
            volume: "${table:NYH.volume}"
        };
        var index = 0;
        for (const settlement of settlementsOrder) {    
            if (settlement.month.toUpperCase() != "TOTAL"){
                lineInfo[`month${index + 1}`] = settlement.settle.replace('.', ',');
                lineTmp[`month${index + 1}`] = "${table:NYH.month" + (index + 1) + "}";
            } else {
                lineInfo.volume=settlement.volume.replace('.', ',');
                lineInfo.date = currentTradeDate; // Format as dd/mm/yyyy for Excel compatibility
            }
            index++;
        }
        var dataLineInfo=[];
        var dataLineTmp=[];
        dataLineInfo.push(lineInfo);
        dataLineTmp.push(lineTmp);
        //Settlement resume
        const currentDate = new Date();
        const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
        var settlementResume = {
            "date": formattedCurrentDate,
            "tradeDate": responseBody.tradeDate,
            "origin": "CMEGroup New York-NYH",
            "amount": responseBody.settlements.length-1 // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data={};
        result.data.lineInfo = dataLineInfo;
        result.data.lineTmp = dataLineTmp;
        result.data.resume = dataLineResume;
        writeFile(__dirname + "\\tmp\\cmegroup-new-york-nyh.json", JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    } catch (error) {
        writeLog(`Error on the CMEGroup-New York NYH request: ${error}`, "ERROR", globalConfig);
        const nowF = new Date();
        const formattedDateF = nowF.toLocaleString();
        writeLog(`Ends at: ${formattedDateF}`, "INFO", globalConfig);
        result.statusCode = "500";
        result.statusDescription = error.message;
        const currentDate = new Date();
        const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
        var settlementResume = {
            "date": formattedCurrentDate,
            "tradeDate": "Unknown", // No trade date available due to error
            "origin": "CMEGroup New York-NYH",
            "amount": "ERROR" // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data={};
        result.data.lineInfo = [];
        result.data.lineTmp = [];
        result.data.resume = dataLineResume;
        writeFile(__dirname + "\\tmp\\cmegroup-new-york-nyh.json", JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    }
}




//Gets XXXX
function getEmpty(date) {
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    }
    return result;
}

module.exports = {
    getCmeGroupChicago,
    getCmeGroupNY,
    getEmpty
}