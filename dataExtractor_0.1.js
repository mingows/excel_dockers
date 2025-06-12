var { writeFile, writeLog, englishDateValidation, formatDateXslx } = require('./utils.js');
var { saveData } = require('./drivers.js');
var request = require('request');
var path = require('path');

const prompt = require('prompt-sync')();


//Gets CMEGroup data from https://www.cmegroup.com/markets/energy/biofuels/chicago-ethanol-platts-swap.settlements.html
function getCmeGroup(date, globalConfig) {
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
        writeLog(`Respuesta JSON obtenida: ${JSON.stringify(responseBody, null, 2)}`, "DEBUG", globalConfig);
        writeFile(__dirname + "/tmp/data#01.json", JSON.stringify(responseBody, null, 2), globalConfig);
        //Manage the results
        var settlemensResult = [];
        var totalVolEstimated = 0;
        for (const settlement of responseBody.settlements) {
            if (settlement.month.toUpperCase() != "TOTAL"){
                var settlementResult = {
                    "tradeDate": responseBody.tradeDate,
                    "origin": "CMEGroup",
                    "settlementMonth": settlement.month,
                    "settlementAmount": settlement.settle                
                };
                settlemensResult.push (settlementResult);
            } else {
                totalVolEstimated=settlement.volume;
            }
        }
        var settlementData = {
            "settlements": settlemensResult,
            "total": totalVolEstimated
        };
        //Settlement resume
        const currentDate = new Date();
        //const nowEnd = new Date();
        const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
        var settlementResume = {
            "date": formattedCurrentDate,
            //"tradeDate": responseBody.tradeDate,
            "tradeDate": responseBody.tradeDate,
            "origin": "CMEGroup",
            "amount": settlementData.settlements.length
        };
        saveData (settlementData, settlementResume, __dirname + "\\data\\", globalConfig)
        return result;
    } catch (error) {
        writeLog(`Error realizando la solicitud: ${error}`, "ERROR", globalConfig);
        const nowF = new Date();
        const formattedDateF = nowF.toLocaleString();
        writeLog(`Hora fin: ${formattedDateF}`, "INFO", globalConfig);
        result.statusCode = error.statusCode;
        result.statusDescription = error.message;
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
    getCmeGroup,
    getEmpty
}