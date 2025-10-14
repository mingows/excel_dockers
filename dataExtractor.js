const { Server } = require('http');
var { writeFile, writeLog, englishDateValidation, orderSettlementsByMonth, formatDateXslx } = require('./utils.js');
var path = require('path');


//Gets CMEGroup data from Chicago
// -date (mandatory): in english format MM/DD/YYYY
function getCmeGroupChicago(date, globalConfig) {
    if (!date) {
        return {
            "statusCode": 500,
            "statusDescription": "Internal Server Error",
            "statusDetails": "No date provided"
        }
    }
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    }
    var request = require('sync-request');
    var options = {
        'method': 'GET',
        'url': 'https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/4708/FUT?strategy=DEFAULT&tradeDate=' + date + '&pageSize=500&isProtected&_t=1747732336411',
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
            writeLog(`No data found for date: ${date}`, "WARN", globalConfig);
            result = {
                "statusCode": 204,
                "statusDescription": "No Content"
            }
            const currentDate = new Date();
            const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
            const [dd, mm, yyyy] = responseBody.tradeDate.split('/');
            const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
            var settlementResume = {
                "date": formattedCurrentDate,
                "tradeDate": responseBody.tradeDate,
                "origin": "CMEGroup Chicago-CU",
                "amount": 0
            };
            var dataLineResume = [];
            dataLineResume.push(settlementResume);
            result.data = {};
            result.data.resume = dataLineResume;
            return result;
        }
        //Manage the results
        var settlementsOrder = [];
        settlementsOrder = orderSettlementsByMonth(responseBody.settlements);
        const currentTDate = new Date(responseBody.tradeDate);
        const currentTradeDate = `${String(currentTDate.getDate()).padStart(2, '0')}/${String(currentTDate.getMonth() + 1).padStart(2, '0')}/${String(currentTDate.getFullYear())}`;
        var lineInfo = {
            date: currentTradeDate,
            volume: 9999
        };
        var lineTmp = {
            date: "${table:CU.date}",
            volume: "${table:CU.volume}"
        };
        var index = 0;
        for (const settlement of settlementsOrder) {
            if (settlement.month.toUpperCase() != "TOTAL") {
                lineInfo[`month${index + 1}`] = parseFloat(settlement.settle);
                lineTmp[`month${index + 1}`] = "${table:CU.month" + (index + 1) + "}";
            } else {
                const [dd, mm, yyyy] = currentTradeDate.split('/');
                const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
                // Convert to Excel date number
                lineInfo.date = formatDateXslx(jsDateUtc);
                lineInfo.volume = parseFloat(settlement.volume.replace(/[.,\s]/g, ''));
            }
            index++;
        }
        var dataLineInfo = [];
        var dataLineTmp = [];
        dataLineInfo.push(lineInfo);
        dataLineTmp.push(lineTmp);
        const currentDate = new Date();
        const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
        //Settlement resume
        const [mm, dd, yyyy] = responseBody.tradeDate.split('/');
        const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
        var settlementResume = {
            "date": formattedCurrentDate,
            "tradeDate": formatDateXslx(jsDateUtc), // Convert to Excel date number
            "origin": "CMEGroup Chicago-CU",
            "amount": responseBody.settlements.length - 1 // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data = {};
        result.data.lineInfo = dataLineInfo;
        result.data.lineTmp = dataLineTmp;
        result.data.resume = dataLineResume;
        writeFile(path.join(__dirname, "tmp", "cmegroup-chicago-cu.json"), JSON.stringify(result.data, null, 2), globalConfig);
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
        result.data = {};
        result.data.lineInfo = [];
        result.data.lineTmp = [];
        result.data.resume = dataLineResume;
        writeFile(path.join(__dirname, "tmp", "cmegroup-chicago-cu.json"), JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    }
}

//Gets CMEGroup data from NY
// -date (mandatory): in english format MM/DD/YYYY
function getCmeGroupNY(date, globalConfig) {
    if (!date) {
        return {
            "statusCode": 500,
            "statusDescription": "Internal Server Error",
            "statusDetails": "No date provided"
        }
    }
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    }
    var request = require('sync-request');
    var options = {
        'method': 'GET',
        'url': 'https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/4759/FUT?strategy=DEFAULT&tradeDate=' + date + '&pageSize=500&isProtected&_t=1748329926274',
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
            writeLog(`No data found for date: ${date}`, "WARN", globalConfig);
            result = {
                "statusCode": 204,
                "statusDescription": "No Content"
            }
            const currentDate = new Date();
            const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
            const [dd, mm, yyyy] = responseBody.tradeDate.split('/');
            const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
            var settlementResume = {
                "date": formattedCurrentDate,
                "tradeDate": responseBody.tradeDate,
                "origin": "CMEGroup New York-NYH",
                "amount": 0
            };
            var dataLineResume = [];
            dataLineResume.push(settlementResume);
            result.data = {};
            result.data.resume = dataLineResume;
            return result;
        }
        //Manage the results
        var settlementsOrder = [];
        settlementsOrder = orderSettlementsByMonth(responseBody.settlements);
        const currentTDate = new Date(responseBody.tradeDate);
        const currentTradeDate = `${String(currentTDate.getDate()).padStart(2, '0')}/${String(currentTDate.getMonth() + 1).padStart(2, '0')}/${String(currentTDate.getFullYear())}`;
        var lineInfo = {
            date: currentTradeDate,
            volume: 9999
        };
        var lineTmp = {
            date: "${table:NYH.date}",
            volume: "${table:NYH.volume}"
        };
        var index = 0;
        for (const settlement of settlementsOrder) {
            if (settlement.month.toUpperCase() != "TOTAL") {
                lineInfo[`month${index + 1}`] = parseFloat(settlement.settle);
                lineTmp[`month${index + 1}`] = "${table:NYH.month" + (index + 1) + "}";
            } else {
                const [dd, mm, yyyy] = currentTradeDate.split('/');
                const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
                // Convert to Excel date number
                lineInfo.date = formatDateXslx(jsDateUtc);
                lineInfo.volume = parseFloat(settlement.volume.replace(/[.,\s]/g, ''));
            }
            index++;
        }
        var dataLineInfo = [];
        var dataLineTmp = [];
        dataLineInfo.push(lineInfo);
        dataLineTmp.push(lineTmp);
        const currentDate = new Date();
        const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
        //Settlement resume
        const [mm, dd, yyyy] = responseBody.tradeDate.split('/');
        const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
        var settlementResume = {
            "date": formattedCurrentDate,
            "tradeDate": formatDateXslx(jsDateUtc), // Convert to Excel date number
            "origin": "CMEGroup New York-NYH",
            "amount": responseBody.settlements.length - 1 // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data = {};
        result.data.lineInfo = dataLineInfo;
        result.data.lineTmp = dataLineTmp;
        result.data.resume = dataLineResume;
        writeFile(path.join(__dirname, "tmp", "cmegroup-new-york-nyh.json"), JSON.stringify(result.data, null, 2), globalConfig);
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
        result.data = {};
        result.data.lineInfo = [];
        result.data.lineTmp = [];
        result.data.resume = dataLineResume;
        writeFile(path.join(__dirname, "tmp", "cmegroup-new-york-nyh.json"), JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    }
}

//Gets CMEGroup data from T2
// -date (mandatory): in english format MM/DD/YYYY
function getCmeGroupT2(date, globalConfig) {
    if (!date) {
        return {
            "statusCode": 500,
            "statusDescription": "Internal Server Error",
            "statusDetails": "No date provided"
        }
    }
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    }
    var request = require('sync-request');
    var options = {
        'method': 'GET',
        'url': 'https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/5187/FUT?strategy=DEFAULT&tradeDate=' + date + '&pageSize=500&isProtected&_t=1748509061872',
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
            writeLog(`No data found for date: ${date}`, "WARN", globalConfig);
            result = {
                "statusCode": 204,
                "statusDescription": "No Content"
            }
            const currentDate = new Date();
            const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
            const [dd, mm, yyyy] = responseBody.tradeDate.split('/');
            const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
            var settlementResume = {
                "date": formattedCurrentDate,
                "tradeDate": responseBody.tradeDate,
                "origin": "CMEGroup T2",
                "amount": 0
            };
            var dataLineResume = [];
            dataLineResume.push(settlementResume);
            result.data = {};
            result.data.resume = dataLineResume;
            return result;
        }
        //Manage the results
        var settlementsOrder = [];
        settlementsOrder = orderSettlementsByMonth(responseBody.settlements);
        const currentTDate = new Date(responseBody.tradeDate);
        const currentTradeDate = `${String(currentTDate.getDate()).padStart(2, '0')}/${String(currentTDate.getMonth() + 1).padStart(2, '0')}/${String(currentTDate.getFullYear())}`;
        var lineInfo = {
            date: currentTradeDate,
            volume: 9999
        };
        var lineTmp = {
            date: "${table:T2.date}",
            volume: "${table:T2.volume}"
        };
        var index = 0;
        for (const settlement of settlementsOrder) {
            if (settlement.month.toUpperCase() != "TOTAL") {
                lineInfo[`month${index + 1}`] = parseFloat(settlement.settle);
                lineTmp[`month${index + 1}`] = "${table:T2.month" + (index + 1) + "}";
            } else {
                const [dd, mm, yyyy] = currentTradeDate.split('/');
                const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
                // Convert to Excel date number
                lineInfo.date = formatDateXslx(jsDateUtc);
                lineInfo.volume = parseFloat(settlement.volume.replace(/[.,\s]/g, ''));
            }
            index++;
        }
        var dataLineInfo = [];
        var dataLineTmp = [];
        dataLineInfo.push(lineInfo);
        dataLineTmp.push(lineTmp);
        const currentDate = new Date();
        const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
        //Settlement resume
        const [mm, dd, yyyy] = responseBody.tradeDate.split('/');
        const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
        var settlementResume = {
            "date": formattedCurrentDate,
            "tradeDate": formatDateXslx(jsDateUtc), // Convert to Excel date number
            "origin": "CMEGroup T2",
            "amount": responseBody.settlements.length - 1 // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data = {};
        result.data.lineInfo = dataLineInfo;
        result.data.lineTmp = dataLineTmp;
        result.data.resume = dataLineResume;
        writeFile(path.join(__dirname, "tmp", "cmegroup-t2.json"), JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    } catch (error) {
        writeLog(`Error on the CMEGroup-T2 request: ${error}`, "ERROR", globalConfig);
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
            "origin": "CMEGroup T2",
            "amount": "ERROR" // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data = {};
        result.data.lineInfo = [];
        result.data.lineTmp = [];
        result.data.resume = dataLineResume;
        writeFile(path.join(__dirname, "tmp", "cmegroup-t2.json"), JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    }
}

//Gets CMEGroup data from Corn
// -date (mandatory): in english format MM/DD/YYYY
function getCmeGroupCorn(date, globalConfig) {
    if (!date) {
        return {
            "statusCode": 500,
            "statusDescription": "Internal Server Error",
            "statusDetails": "No date provided"
        }
    }
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    }
    var request = require('sync-request');
    var options = {
        'method': 'GET',
        'url': 'https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/300/FUT?strategy=DEFAULT&tradeDate=' + date + '&pageSize=500&isProtected&_t=1748513906708',
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
            writeLog(`No data found for date: ${date}`, "WARN", globalConfig);
            result = {
                "statusCode": 204,
                "statusDescription": "No Content"
            }
            const currentDate = new Date();
            const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
            const [dd, mm, yyyy] = responseBody.tradeDate.split('/');
            const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
            var settlementResume = {
                "date": formattedCurrentDate,
                "tradeDate": responseBody.tradeDate,
                "origin": "CMEGroup Corn",
                "amount": 0
            };
            var dataLineResume = [];
            dataLineResume.push(settlementResume);
            result.data = {};
            result.data.resume = dataLineResume;
            return result;
        }
        //Manage the results
        var settlementsOrder = [];
        settlementsOrder = orderSettlementsByMonth(responseBody.settlements);
        const currentTDate = new Date(responseBody.tradeDate);
        const currentTradeDate = `${String(currentTDate.getDate()).padStart(2, '0')}/${String(currentTDate.getMonth() + 1).padStart(2, '0')}/${String(currentTDate.getFullYear())}`;
        var lineInfo = {
            date: currentTradeDate,
            volume: 9999
        };
        var lineTmp = {
            date: "${table:CORN.date}",
            volume: "${table:CORN.volume}"
        };
        var index = 0;
        for (const settlement of settlementsOrder) {
            if (settlement.month.toUpperCase() != "TOTAL") {
                lineInfo[`month${index + 1}`] = parseFloat(settlement.settle);
                lineTmp[`month${index + 1}`] = "${table:CORN.month" + (index + 1) + "}";
            } else {
                const [dd, mm, yyyy] = currentTradeDate.split('/');
                const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
                // Convert to Excel date number
                lineInfo.date = formatDateXslx(jsDateUtc);
                lineInfo.volume = parseFloat(settlement.volume.replace(/[.,\s]/g, ''));
            }
            index++;
        }
        var dataLineInfo = [];
        var dataLineTmp = [];
        dataLineInfo.push(lineInfo);
        dataLineTmp.push(lineTmp);
        const currentDate = new Date();
        const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
        //Settlement resume
        const [mm, dd, yyyy] = responseBody.tradeDate.split('/');
        const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
        var settlementResume = {
            "date": formattedCurrentDate,
            "tradeDate": formatDateXslx(jsDateUtc), // Convert to Excel date number
            "origin": "CMEGroup Corn",
            "amount": responseBody.settlements.length - 1 // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data = {};
        result.data.lineInfo = dataLineInfo;
        result.data.lineTmp = dataLineTmp;
        result.data.resume = dataLineResume;
        writeFile(path.join(__dirname, "tmp", "cmegroup-corn.json"), JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    } catch (error) {
        writeLog(`Error on the CMEGroup-Corn request: ${error}`, "ERROR", globalConfig);
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
            "origin": "CMEGroup Corn",
            "amount": "ERROR" // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data = {};
        result.data.lineInfo = [];
        result.data.lineTmp = [];
        result.data.resume = dataLineResume;
        writeFile(path.join(__dirname, "tmp", "cmegroup-corn.json"), JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    }
}

//Gets CMEGroup data from Rbob
// -date (mandatory): in english format MM/DD/YYYY
function getCmeGroupRbob(date, globalConfig) {
    if (!date) {
        return {
            "statusCode": 500,
            "statusDescription": "Internal Server Error",
            "statusDetails": "No date provided"
        }
    }
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    }
    var request = require('sync-request');
    var options = {
        'method': 'GET',
        'url': 'https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/429/FUT?strategy=DEFAULT&tradeDate=' + date + '&pageSize=500&isProtected&_t=1748515985882',
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
            writeLog(`No data found for date: ${date}`, "WARN", globalConfig);
            result = {
                "statusCode": 204,
                "statusDescription": "No Content"
            }
            const currentDate = new Date();
            const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
            const [dd, mm, yyyy] = responseBody.tradeDate.split('/');
            const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
            var settlementResume = {
                "date": formattedCurrentDate,
                "tradeDate": responseBody.tradeDate,
                "origin": "CMEGroup RBob",
                "amount": 0
            };
            var dataLineResume = [];
            dataLineResume.push(settlementResume);
            result.data = {};
            result.data.resume = dataLineResume;
            return result;
        }
        //Manage the results
        var settlementsOrder = [];
        settlementsOrder = orderSettlementsByMonth(responseBody.settlements);
        const currentTDate = new Date(responseBody.tradeDate);
        const currentTradeDate = `${String(currentTDate.getDate()).padStart(2, '0')}/${String(currentTDate.getMonth() + 1).padStart(2, '0')}/${String(currentTDate.getFullYear())}`;
        var lineInfo = {
            date: currentTradeDate,
            volume: 9999
        };
        var lineTmp = {
            date: "${table:RBOB.date}",
            volume: "${table:RBOB.volume}"
        };
        var index = 0;
        for (const settlement of settlementsOrder) {
            if (settlement.month.toUpperCase() != "TOTAL") {
                lineInfo[`month${index + 1}`] = parseFloat(settlement.settle);
                lineTmp[`month${index + 1}`] = "${table:RBOB.month" + (index + 1) + "}";
            } else {
                const [dd, mm, yyyy] = currentTradeDate.split('/');
                const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
                // Convert to Excel date number
                lineInfo.date = formatDateXslx(jsDateUtc);
                lineInfo.volume = parseFloat(settlement.volume.replace(/[.,\s]/g, ''));
            }
            index++;
        }
        var dataLineInfo = [];
        var dataLineTmp = [];
        dataLineInfo.push(lineInfo);
        dataLineTmp.push(lineTmp);
        const currentDate = new Date();
        const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
        //Settlement resume
        const [mm, dd, yyyy] = responseBody.tradeDate.split('/');
        const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
        var settlementResume = {
            "date": formattedCurrentDate,
            "tradeDate": formatDateXslx(jsDateUtc), // Convert to Excel date number
            "origin": "CMEGroup RBob",
            "amount": responseBody.settlements.length - 1 // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data = {};
        result.data.lineInfo = dataLineInfo;
        result.data.lineTmp = dataLineTmp;
        result.data.resume = dataLineResume;
        writeFile(path.join(__dirname, "tmp", "cmegroup-rbob.json"), JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    } catch (error) {
        writeLog(`Error on the CMEGroup-RBob request: ${error}`, "ERROR", globalConfig);
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
            "origin": "CMEGroup RBob",
            "amount": "ERROR" // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data = {};
        result.data.lineInfo = [];
        result.data.lineTmp = [];
        result.data.resume = dataLineResume;
        writeFile(path.join(__dirname, "tmp", "cmegroup-rbob.json"), JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    }
}


//Gets CMEGroup data from Sugar 11
// -date (mandatory): in english format MM/DD/YYYY
function getCmeGroupSugar11(date, globalConfig) {
    if (!date) {
        return {
            "statusCode": 500,
            "statusDescription": "Internal Server Error",
            "statusDetails": "No date provided"
        }
    }
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    }
    var request = require('sync-request');
    var options = {
        'method': 'GET',
        'url': 'https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/470/FUT?strategy=DEFAULT&tradeDate=' + date + '&pageSize=500&isProtected&_t=1748518295308',
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
            writeLog(`No data found for date: ${date}`, "WARN", globalConfig);
            result = {
                "statusCode": 204,
                "statusDescription": "No Content"
            }
            const currentDate = new Date();
            const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
            const [dd, mm, yyyy] = responseBody.tradeDate.split('/');
            const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
            var settlementResume = {
                "date": formattedCurrentDate,
                "tradeDate": responseBody.tradeDate,
                "origin": "CMEGroup Sugar 11",
                "amount": 0
            };
            var dataLineResume = [];
            dataLineResume.push(settlementResume);
            result.data = {};
            result.data.resume = dataLineResume;
            return result;
        }
        //Manage the results
        var settlementsOrder = [];
        settlementsOrder = orderSettlementsByMonth(responseBody.settlements);
        const currentTDate = new Date(responseBody.tradeDate);
        const currentTradeDate = `${String(currentTDate.getDate()).padStart(2, '0')}/${String(currentTDate.getMonth() + 1).padStart(2, '0')}/${String(currentTDate.getFullYear())}`;
        var lineInfo = {
            date: currentTradeDate,
            volume: 9999
        };
        var lineTmp = {
            date: "${table:Sugar 11.date}",
            volume: "${table:Sugar 11.volume}"
        };
        var index = 0;
        for (const settlement of settlementsOrder) {
            if (settlement.month.toUpperCase() != "TOTAL") {
                lineInfo[`month${index + 1}`] = parseFloat(settlement.settle);
                lineTmp[`month${index + 1}`] = "${table:Sugar 11.month" + (index + 1) + "}";
            } else {
                const [dd, mm, yyyy] = currentTradeDate.split('/');
                const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
                // Convert to Excel date number
                lineInfo.date = formatDateXslx(jsDateUtc);
                lineInfo.volume = parseFloat(settlement.volume.replace(/[.,\s]/g, ''));
            }
            index++;
        }
        var dataLineInfo = [];
        var dataLineTmp = [];
        dataLineInfo.push(lineInfo);
        dataLineTmp.push(lineTmp);
        const currentDate = new Date();
        const formattedCurrentDate = `${String(currentDate.getFullYear())}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')} ${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}:${String(currentDate.getSeconds()).padStart(2, '0')}`;
        //Settlement resume
        const [mm, dd, yyyy] = responseBody.tradeDate.split('/');
        const jsDateUtc = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
        var settlementResume = {
            "date": formattedCurrentDate,
            "tradeDate": formatDateXslx(jsDateUtc), // Convert to Excel date number
            "origin": "CMEGroup Sugar 11",
            "amount": responseBody.settlements.length - 1 // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data = {};
        result.data.lineInfo = dataLineInfo;
        result.data.lineTmp = dataLineTmp;
        result.data.resume = dataLineResume;
        writeFile(path.join(__dirname, "tmp", "cmegroup-sugar-11.json"), JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    } catch (error) {
        writeLog(`Error on the CMEGroup-Sugar 11 request: ${error}`, "ERROR", globalConfig);
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
            "origin": "CMEGroup Sugar 11",
            "amount": "ERROR" // Exclude the total settlement
        };
        var dataLineResume = [];
        dataLineResume.push(settlementResume);
        result.data = {};
        result.data.lineInfo = [];
        result.data.lineTmp = [];
        result.data.resume = dataLineResume;
        writeFile(path.join(__dirname, "tmp", "cmegroup-sugar-11.json"), JSON.stringify(result.data, null, 2), globalConfig);
        return result;
    }
}

function getESALQ_Paulinia(date, globalConfig) {

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
    getCmeGroupT2,
    getCmeGroupCorn,
    getCmeGroupRbob,
    getCmeGroupSugar11,
    getEmpty
}