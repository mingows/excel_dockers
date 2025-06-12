var fs = require('fs');
var xlsxTemplate = require('xlsx-template');

var { writeLog, writeFile, appendFile, formatDate, orderSettlementsByMonth, formatDateXslx } = require('./utils.js');

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
        } else {
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

function excelSaveResume(resumeData, filePath, globalConfig) {
    const TEMPLATE_PATH = __dirname + "\\resume_template.xlsx";
    const TEMPLATE_TMP_PATH = __dirname + "\\tmp\\resume_template.xlsx";
    const OUTPUT_PATH = filePath + "resume.xlsx";
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    };
    try {
        // Save resume info into the Excel
        var resumeDataLine = [];
        var resumeLine = {
            date: resumeData.date,
            tradeDate: resumeData.tradeDate,
            origin: resumeData.origin,
            amount: resumeData.amount
        };
        resumeDataLine.push(resumeLine);
        // Create the Excel resume file
        let templateDataContent = fs.readFileSync(TEMPLATE_PATH);
        var template = new xlsxTemplate(templateDataContent);
        // Insert data into the template
        template.substitute("resumeData", { resumeData: resumeDataLine });
        // Get binary data
        var binaryData = template.generate({ type: 'nodebuffer' });
        // Delete the file if exits
        if (fs.existsSync(OUTPUT_PATH)) {
            fs.unlinkSync(OUTPUT_PATH);
        }
        // Save the file
        fs.writeFileSync(OUTPUT_PATH, binaryData); // Changed from appendFileSync to writeFileSync for new/overwritten file

        // Create the Excel template resume file
        var resumeDataLineTmp = [];
        // resumeDataLineTmp.push(resumeLine); // This was incorrect, resumeDataLineTmp should only contain placeholders
        var resumeLineTmp = {
            date: "${table:resumeData.date}",
            tradeDate: "${table:resumeData.tradeDate}",
            origin: "${table:resumeData.origin}",
            amount: "${table:resumeData.amount}"
        };
        resumeDataLineTmp.push(resumeLineTmp);

        let templateDataContentForTmp = fs.readFileSync(TEMPLATE_PATH);
        var templateTmp = new xlsxTemplate(templateDataContentForTmp);
        // Insert data into the template
        templateTmp.substitute("resumeData", { resumeData: resumeDataLineTmp });
        // Get binary data
        var binaryDataTmp = templateTmp.generate({ type: 'nodebuffer' });
        // Delete the file if exits
        if (fs.existsSync(TEMPLATE_TMP_PATH)) {
            fs.unlinkSync(TEMPLATE_TMP_PATH);
        }
        // Save the file
        fs.writeFileSync(TEMPLATE_TMP_PATH, binaryDataTmp); // Changed from appendFileSync to writeFileSync
        // Copy the updated file into the template file
        fs.copyFileSync(TEMPLATE_TMP_PATH, TEMPLATE_PATH);

        writeLog("Writted resume data in the file: " + OUTPUT_PATH, "DEBUG", globalConfig);
    } catch (error) {
        const nowErrorEnd = new Date();
        const formattedErrorDateEnd = formatDate(nowErrorEnd.toLocaleString());
        writeLog(`Error in excelSaveResume: ${error}. Hora fin: ${formattedErrorDateEnd}`, "ERROR", globalConfig);
        result.statusCode = 400;
        result.statusDescription = "Error writing file: " + error;
    }
    return result;
}

function excelSaveCmeGroup(data, filePath, globalConfig) {
    const TEMPLATE_PATH = __dirname + "\\Master data_JUL22_template.xlsx";
    const TEMPLATE_TMP_PATH = __dirname + "\\tmp\\Master data_JUL22_template.xlsx";
    const OUTPUT_PATH = filePath + "Master data_JUL22.xlsx";
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    };
    try {
        // Save info the Excel
        var dataLine = [];
        var settlementsOrder = [];
        settlementsOrder = orderSettlementsByMonth(data.settlements);
        let dateToProcess = new Date(settlementsOrder[0].tradeDate);
        const formattedDateToProcess = `${String(dateToProcess.getMonth() + 1).padStart(2, '0')}/${String(dateToProcess.getDate()).padStart(2, '0')}/${String(dateToProcess.getFullYear())}`;
        const parts = formattedDateToProcess.split('/');
        const month = parseInt(parts[0], 10) -1; // Los meses en JavaScript son 0-indexados
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        const tradeDate = new Date(year, month, day);
        var dataInfo = {
            date: day+"/"+ (month + 1) + "/" + year, // Format as dd/mm/yyyy for Excel compatibility
            volume: data.total.replace(',',''),
            month1: settlementsOrder[0].settlementAmount.replace('.', ','),
            month2: settlementsOrder[1].settlementAmount.replace('.', ','),
            month3: settlementsOrder[2].settlementAmount.replace('.', ','),
            month4: settlementsOrder[3].settlementAmount.replace('.', ','),
            month5: settlementsOrder[4].settlementAmount.replace('.', ','),
            month6: settlementsOrder[5].settlementAmount.replace('.', ','),
            month7: settlementsOrder[6].settlementAmount.replace('.', ','),
            month8: settlementsOrder[7].settlementAmount.replace('.', ','),
            month9: settlementsOrder[8].settlementAmount.replace('.', ','),
            month10: settlementsOrder[9].settlementAmount.replace('.', ','),
            month11: settlementsOrder[10].settlementAmount.replace('.', ',')
        };
        dataLine.push(dataInfo);
        
        // Create the Excel data file
        let templateDataContent = fs.readFileSync(TEMPLATE_PATH);
        var template = new xlsxTemplate(templateDataContent);
        // Insert data into the template
        template.substitute("CU", { CU: dataLine });
        // Get binary data
        var binaryData = template.generate({ type: 'nodebuffer' });
        // Delete the file if exits
        if (fs.existsSync(OUTPUT_PATH)) {
            fs.unlinkSync(OUTPUT_PATH);
        }
        // Save the file
        fs.writeFileSync(OUTPUT_PATH, binaryData); // Changed from appendFileSync to writeFileSync

        // Create the Excel template data file
        var dataLineTmp = [];
        dataLineTmp.push(dataInfo); // This was incorrect, dataLineTmp should only contain placeholders
        var cmeLineTmp = { // Renamed from resumeLineTmp for clarity
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
            month11: "${table:CU.month11}"
        };
        dataLineTmp.push(cmeLineTmp);

        let templateDataContentForTmp = fs.readFileSync(TEMPLATE_PATH);
        var templateTmp = new xlsxTemplate(templateDataContentForTmp);
        // Insert data into the template
        templateTmp.substitute("CU", { CU: dataLineTmp }); // Corrected { dataLineTmp: dataLineTmp } to { CU: dataLineTmp }
        // Get binary data
        var binaryDataTmp = templateTmp.generate({ type: 'nodebuffer' });
        // Delete the file if exits
        if (fs.existsSync(TEMPLATE_TMP_PATH)) {
            fs.unlinkSync(TEMPLATE_TMP_PATH);
        }
        // Save the file
        fs.writeFileSync(TEMPLATE_TMP_PATH, binaryDataTmp); // Changed from appendFileSync to writeFileSync
        // Copy the updated file into the template file
        fs.copyFileSync(TEMPLATE_TMP_PATH, TEMPLATE_PATH);

        //appendFile(filePath + "/resumeData#01.json", JSON.stringify(resumeDataFinal, null, 2) + "\n", globalConfig);
        writeLog(`Writted resume datain the file: ${__dirname}` + "/tmp/resumeData#01.json", "DEBUG", globalConfig);
    } catch (error) {
        const nowErrorEnd = new Date();
        const formattedErrorDateEnd = formatDate(nowErrorEnd.toLocaleString());
        writeLog(`Error in excelSaveCmeGroup: ${error}. Hora fin: ${formattedErrorDateEnd}`, "ERROR", globalConfig);
        result.statusCode = 400;
        result.statusDescription = "Error writing file";
    }
    return result;
}


module.exports = {
    saveData,
    excelSaveCmeGroup,
    excelSaveResume

}