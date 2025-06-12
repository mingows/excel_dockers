var fs = require('fs');
var xlsxTemplate = require('xlsx-template');

var { writeLog, writeFile, appendFile, formatDate } = require('./utils.js');

//All data shuold be in next format:
// settlementsResult = 
//     "settlements":[{
//            "tradeDate": responseBody.tradeDate,
//            "origin": "CMEGroup",
//            "settlementMonth": settlement.month,
//            "settlementAmount": settlement.settle                
// }],
//     "total":"Estimated volume totals";
//For resume dashboard, the data should be in this format:
// settlementsResume = {
//     "date": responseBody.tradeDate,
//     "tradeDate": responseBody.tradeDate,
//     "origin": "CMEGroup",
//     "amount": count(settlements)             
// };



const SAVE_ON = "EXCEL"; //Should be FILE, EXCEL, DB

function saveData(data, resumeData, filePath, globalConfig) {
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    };
    switch (SAVE_ON) {
        case "FILE":
            // Save to file
            result = fileSave(data, resumeData, filePath, globalConfig)
            return result;
        case "EXCEL":
            result = excelSave(data, resumeData, filePath, globalConfig)
            return result;
        case "DB":
            writeLog(`Error: SAVE_ON is not ready yet: ${SAVE_ON}`, "ERROR", globalConfig);
            result.statusCode = 400;
            result.statusDescription = "Wrong SAVE_ON value. Expected values: FILE, EXCEL, DB";
            return result;
        default:
            writeLog(`Error: SAVE_ON is not valid: ${SAVE_ON}`, "ERROR", globalConfig);
            result.statusCode = 400;
            result.statusDescription = "Wrong SAVE_ON value. Expected values: FILE, EXCEL, DB";
            return result;
    }
}

function fileSave(data, resumeData, filePath, globalConfig) {
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    };
    try {
        if (data.settlements.length > 0) {
            appendFile(filePath + "/data#01.json", JSON.stringify(data, null, 2) + "\n", globalConfig);
            writeLog(`Writted data in the file: ${__dirname}` + "/ tmp/data#01.json", "DEBUG", globalConfig);
            result = {
                "statusCode": 200,
                "statusDescription": "OK"
            };
        } else{
            result = {
                "statusCode": 204,
                "statusDescription": "No Content"
            };
        };
        appendFile(filePath + "/resumeData#01.json", JSON.stringify(resumeData, null, 2) + "\n", globalConfig);
        writeLog(`Writted resume datain the file: ${__dirname}` + "/tmp/resumeData#01.json", "DEBUG", globalConfig);
    } catch (error) {
        writeLog(`Error: ${error}`, "ERROR", globalConfig);
        result.statusCode = 400;
        result.statusDescription = "Error writing file";
    }
    return result;
}

function excelSave(data, resumeData, filePath, globalConfig) {
    const TEMPLATE_PATH = __dirname+"\\resume_template.xlsx";
    const TEMPLATE_TMP_PATH = __dirname+"\\tmp\\resume_template.xlsx";
    const OUTPUT_PATH = filePath+"resumeeeee.xlsx";
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    };
    try {
        if (data.settlements.length > 0) {
            appendFile(filePath + "/data#01.json", JSON.stringify(data, null, 2) + "\n", globalConfig);
            writeLog(`Writted data in the file: ${__dirname}` + "/ tmp/data#01.json", "DEBUG", globalConfig);
            result = {
                "statusCode": 200,
                "statusDescription": "OK"
            };
        } else{
            result = {
                "statusCode": 204,
                "statusDescription": "No Content"
            };
        };
        // Save resume info the Excel
        var resumeDataLine = [];
        var resumeLine = {
            date: resumeData.date,
            tradeDate: resumeData.tradeDate,
            origin: resumeData.origin,
            amount: resumeData.amount
        };
        resumeDataLine.push (resumeLine);
        // Create the Excel resume file
        fs.readFile(TEMPLATE_PATH, function (err, templateData) {
            if (err) {
                const nowErrorEnd = new Date();
                const formattedErrorDateEnd = formatDate(nowErrorEnd.toLocaleString());
                writeLog(`Hora fin: ${formattedErrorDateEnd}`, "INFO", globalConfig);
                throw err;
            }
            var template = new xlsxTemplate(templateData);
            // Insert data into the template
            template.substitute("resumeData", { resumeData: resumeDataLine });
            // Get binary data
            var binaryData = template.generate({ type: 'nodebuffer' });
            // Delete the file if exits
            if (fs.existsSync(OUTPUT_PATH)) {
                fs.unlinkSync(OUTPUT_PATH);
            }
            // Save the file
            fs.appendFileSync(OUTPUT_PATH, binaryData);
            // Copy the updated file into the template file
            //fs.copyFileSync(OUTPUT_PATH, TEMPLATE_PATH);
        });
        // Create the Excel template resume file
        var resumeDataLineTmp = [];
        resumeDataLineTmp.push (resumeLine);
        var resumeLineTmp = {
            date: "${table:resumeData.date}",
            tradeDate: "${table:resumeData.tradeDate}",
            origin: "${table:resumeData.origin}",
            amount: "${table:resumeData.amount}"
        };
        resumeDataLineTmp.push (resumeLineTmp);
        fs.readFile(TEMPLATE_PATH, function (err, templateData) {
            if (err) {
                const nowErrorEnd = new Date();
                const formattedErrorDateEnd = formatDate(nowErrorEnd.toLocaleString());
                writeLog(`Hora fin: ${formattedErrorDateEnd}`, "INFO", globalConfig);
                throw err;
            }
            var templateTmp = new xlsxTemplate(templateData);
            // Insert data into the template
            templateTmp.substitute("resumeData", { resumeData: resumeDataLineTmp });
            // Get binary data
            var binaryData = templateTmp.generate({ type: 'nodebuffer' });
            // Delete the file if exits
            if (fs.existsSync(TEMPLATE_TMP_PATH)) {
                fs.unlinkSync(TEMPLATE_TMP_PATH);
            }
            // Save the file
            fs.appendFileSync(TEMPLATE_TMP_PATH, binaryData);
            // Copy the updated file into the template file
            fs.copyFileSync(TEMPLATE_TMP_PATH, TEMPLATE_PATH);
        });

        //appendFile(filePath + "/resumeData#01.json", JSON.stringify(resumeDataFinal, null, 2) + "\n", globalConfig);
        writeLog(`Writted resume datain the file: ${__dirname}` + "/tmp/resumeData#01.json", "DEBUG", globalConfig);
    } catch (error) {
        writeLog(`Error: ${error}`, "ERROR", globalConfig);
        result.statusCode = 400;
        result.statusDescription = "Error writing file";
    }
    return result;
}

module.exports = {
    saveData
}