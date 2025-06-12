var fs = require('fs');
var xlsxTemplate = require('xlsx-template');
var path = require('path');

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
            appendFile(fpath.join(filePath, "data#01.json"), JSON.stringify(data, null, 2) + "\n", globalConfig);
            //appendFile(filePath + "/data#01.json", JSON.stringify(data, null, 2) + "\n", globalConfig);
            writeLog(`Writted data in the file: ` + fpath.join(filePath, "data#01.json"), "DEBUG", globalConfig);
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
        // appendFile(filePath + "/resumeData#01.json", JSON.stringify(resumeData, null, 2) + "\n", globalConfig);
        // writeLog(`Writted resume datain the file: ${__dirname}` + "/tmp/resumeData#01.json", "DEBUG", globalConfig);
    } catch (error) {
        writeLog(`Error: ${error}`, "ERROR", globalConfig);
        result.statusCode = 400;
        result.statusDescription = "Error writing file";
    }
    return result;
}

function excelSaveResume(resumeData, filePath, globalConfig) {
    const TEMPLATE_PATH = path.join(__dirname, "resume_template.xlsx");
    const TEMPLATE_TMP_PATH = path.join(__dirname, "tmp", resume_template.xlsx);
    const OUTPUT_PATH = path.join(__dirname, resume.xlsx);
    // const TEMPLATE_PATH = __dirname + "\\resume_template.xlsx";
    // const TEMPLATE_TMP_PATH = __dirname + "\\tmp\\resume_template.xlsx";
    // const OUTPUT_PATH = filePath + "resume.xlsx";
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
        resumeDataLineTmp.push(resumeLine);
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

function excelSave(data, filePath, globalConfig) {
    const TEMPLATE_PATH = path.join(filePath, "Master data_JUL22_template.xlsx");
    const OUTPUT_PATH = path.join(filePath, "data", "Master data_JUL22.xlsx");
    const TEMPLATE_RESUME_PATH = path.join(filePath, "resume_template.xlsx");
    const OUTPUT_RESUME_PATH = path.join(filePath, "data", "resume.xlsx");
    var result = {
        "statusCode": 200,
        "statusDescription": "OK"
    };
    try {
        //Starting reading the excel template data file
        let templateDataContent = fs.readFileSync(TEMPLATE_PATH);
        var templateData = new xlsxTemplate(templateDataContent);

        //Starting reading the excel template resume file
        let templateResumeContent = fs.readFileSync(TEMPLATE_RESUME_PATH);
        var templateResume = new xlsxTemplate(templateResumeContent);

        //Starting reading the excel template data file for tmp
        let templateDataTmpContent = fs.readFileSync(TEMPLATE_PATH);
        var templateDataTmp = new xlsxTemplate(templateDataTmpContent);

        //Starting reading the excel template resume data file for tmp
        let templateResumeTmpContent = fs.readFileSync(TEMPLATE_RESUME_PATH);
        var templateResumeTmp = new xlsxTemplate(templateResumeTmpContent);

        var resumeLine = [];
        var resumeLine2 = [];
        var resumeLineTmp = [];
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                var keyName = key.replace('_', ' ');
                console.log(`- Nombre del campo: ${keyName}`);
                var dataLine = [];
                var dataLineTmp = [];
                dataLine = data[key].data;
                //Add info to the data template
                templateData.substitute(keyName, { [keyName]: dataLine });
                resumeLine.push(data[key].resume[0]);
                resumeLine2.push(data[key].resume[0]);
                dataLineTmp.push(dataLine[0]);
                dataLineTmp.push(data[key].tmp[0]);
                //Hay que meter dataLineTMP en un template para la excel
                templateDataTmp.substitute(keyName, { [keyName]: dataLineTmp }); 
            }
        }
        var markLine = {
            date: "${table:resumeData.date}",
            tradeDate: "${table:resumeData.tradeDate}",
            origin: "${table:resumeData.origin}",
            amount: "${table:resumeData.amount}"
        };
        resumeLineTmp=resumeLine;
        resumeLineTmp.push(markLine);

        templateResume.substitute("resumeData", { resumeData: resumeLine2 });
        templateResumeTmp.substitute("resumeData", { resumeData: resumeLineTmp });

        // Get binary data
        var binaryData = templateData.generate({ type: 'nodebuffer' });
        var binaryResume = templateResume.generate({ type: 'nodebuffer' });
        var binaryDataTmp = templateDataTmp.generate({ type: 'nodebuffer' });
        var binaryResumeTmp = templateResumeTmp.generate({ type: 'nodebuffer' });
        // Delete the data file if exits and save the new
        if (fs.existsSync(OUTPUT_PATH)) {
            fs.unlinkSync(OUTPUT_PATH);
        }
        fs.writeFileSync(OUTPUT_PATH, binaryData);
        // Delete the template data file if exits and save the new
        if (fs.existsSync(TEMPLATE_PATH)) {
            fs.unlinkSync(TEMPLATE_PATH);
        }
        fs.writeFileSync(TEMPLATE_PATH, binaryDataTmp);
        // Delete the resume file if exits nd save the new
        if (fs.existsSync(OUTPUT_RESUME_PATH)) {
            fs.unlinkSync(OUTPUT_RESUME_PATH);
        }
        fs.writeFileSync(OUTPUT_RESUME_PATH, binaryResume);
        // Delete the template resume file if exits nd save the new
        if (fs.existsSync(TEMPLATE_RESUME_PATH)) {
            fs.unlinkSync(TEMPLATE_RESUME_PATH);
        }
        fs.writeFileSync(TEMPLATE_RESUME_PATH, binaryResumeTmp);
    } catch (error) {
        const nowErrorEnd = new Date();
        const formattedErrorDateEnd = formatDate(nowErrorEnd.toLocaleString());
        writeLog(`Error in excelSaveCmeGroup: ${error}. Hora fin: ${formattedErrorDateEnd}`, "ERROR", globalConfig);
        result.statusCode = 400;
        result.statusDescription = "Error writing file";
        return result;
    }
    return result;
}

module.exports = {
    saveData,
    excelSave,
    excelSaveResume
}