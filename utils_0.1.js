//const prompt = require('prompt-sync')();
var fs = require('fs');
var path = require('path');

// Definir las constantes del módulo
const CONSOLE_LOG = true
//const logLevel = ["INFO","ERROR","WARNING","DEBUG"];
const logLevel = ["INFO", "ERROR", "DEBUG"];
const LOG_FILE_SIZE_LIMIT = 5 * 1024 * 1000; // 5MB
const MAX_LOG_FILES = 4;
var CONSTANTS = {
    workingPath: __dirname,
    // environment: 'DEV',
    // apiBasePath: 'https://api-manager.scib.dev.corp/api',
    // clientId: '09390a65-b121-4cd3-bbc4-bebe7a6500d0',
    // clientSecret: '8c85d438-9d8c-43da-95d5-eaa6da74be65'
};

function getConstants() {
    var constants = JSON.stringify(CONSTANTS);
    writeLog("Obtenemos las constantes" + JSON.stringify(CONSTANTS), "DEBUG", CONSTANTS);
    return constants;
}

function setConstants(globalConfig) {
    CONSTANTS = globalConfig;
    writeLog("Devolvemos las constantes" + JSON.stringify(CONSTANTS), "DEBUG", CONSTANTS);
    return CONSTANTS;
}

function writeLog(message, level, globalConfig) {
    if (logLevel.includes(level)) {
        const stack = new Error().stack;
        const stackLines = stack.split('\n');
        const callerInfo = stackLines[2].match(/\s*at\s*(.*)\s*\((.*):\d+:\d+\)/);
        const callerFunction = callerInfo[1];
        const callerFile = callerInfo[2];
        const callerModule = path.basename(callerFile);
        const timestamp = new Date().toISOString();
        // Agregamos el nombre del módulo llamador y la función al mensaje
        let logMessage;
        if (callerFunction === "Object.<anonymous> ") {
            logMessage = `${timestamp}[${callerModule}][${level}] ${message}`;
        } else {
            logMessage = `${timestamp}[${callerModule}.${callerFunction}][${level}] ${message}`;
        }
        fs.appendFileSync(globalConfig.workingPath + '/logs/log.txt', logMessage + '\n');
        // Rotamos los logs si el archivo supera el límite de tamaño
        if (fs.existsSync(globalConfig.workingPath + '/logs/log.txt') && fs.statSync(globalConfig.workingPath + '/logs/log.txt').size >= LOG_FILE_SIZE_LIMIT) {
            rotateFile(globalConfig.workingPath + '/logs', "log", "txt");
        }
        if (CONSOLE_LOG) {
            console.log(logMessage);
        }

    }
}

// function rotateLogs(logPath) {
//     for (let i = MAX_LOG_FILES - 1; i > 0; i--) {
//         const currentLog = `${logPath}/log${i}.txt`;
//         const nextLog = `${logPath}/log${i + 1}.txt`;
//         if (fs.existsSync(currentLog)) {
//             fs.renameSync(currentLog, nextLog);
//         }
//     }
//     const firstLog = `${logPath}/log.txt`;
//     const secondLog = `${logPath}/log1.txt`;
//     if (fs.existsSync(firstLog)) {
//         fs.renameSync(firstLog, secondLog);
//     }
// }

function rotateFile(logPath,fileName,fileExtenesion) {
    for (let i = MAX_LOG_FILES - 1; i > 0; i--) {
        const currentLog = `${logPath}/${fileName}${i}.${fileExtenesion}`;
        const nextLog = `${logPath}/${fileName}${i + 1}.${fileExtenesion}`;
        if (fs.existsSync(currentLog)) {
            fs.renameSync(currentLog, nextLog);
        }
    }
    const firstLog = `${logPath}/${fileName}.${fileExtenesion}`;
    const secondLog = `${logPath}/${fileName}1.${fileExtenesion}`;
    if (fs.existsSync(firstLog)) {
        fs.renameSync(firstLog, secondLog);
    }
}

function writeFile(path, content, globalConfig) {
    //writeLog(`Escribiendo en el archivo: ${path}`,"DEBUG",globalConfig);
    fs.writeFileSync(path, content, { encoding: 'utf8' });
    //writeLog(`Escritura finalizada`,"DEBUG",globalConfig);
}

/**
 * Valida si una cadena de fecha tiene el formato MM/DD/YYYY y es una fecha válida.
 * @param {string} dateString La cadena de fecha a validar (ej. "12/31/2023").
 * @returns {boolean} True si la fecha es válida y tiene el formato correcto, false en caso contrario.
 */
function englishDateValidation(dateString) {
    // 1. Verificar el formato con una expresión regular (MM/DD/YYYY)
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(dateString)) {
        return false; // El formato no es MM/DD/YYYY
    }

    // 2. Dividir la cadena en mes, día y año
    const parts = dateString.split('/');
    const month = parseInt(parts[0], 10); // Mes
    const day = parseInt(parts[1], 10);   // Día
    const year = parseInt(parts[2], 10);  // Año

    // 3. Comprobaciones básicas del rango
    // El mes debe estar entre 1 y 12
    if (month < 1 || month > 12) {
        return false;
    }
    // El día debe estar entre 1 y 31 (una comprobación más precisa se hará con el objeto Date)
    if (day < 1 || day > 31) {
        return false;
    }
    // El año debe ser un número positivo (puedes ajustar esto si necesitas un rango específico)
    if (year <= 0) {
        return false;
    }

    // 4. Crear un objeto Date para una validación más robusta.
    // El constructor de Date en JavaScript usa meses indexados desde 0 (0 = Enero, 11 = Diciembre).
    const date = new Date(year, month - 1, day);

    // 5. Verificar que el objeto Date no haya "corregido" la fecha.
    // Si, por ejemplo, se pasa "02/30/2023", el objeto Date podría interpretarlo como "03/02/2023".
    // Esta comprobación asegura que el año, mes y día coincidan con los valores originales.
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 && // Comparamos con el mes 0-indexado
        date.getDate() === day
    );
}


function appendFile(path, content, globalConfig) {
    writeLog(`Escribiendo en el archivo: ${path}`, "DEBUG", globalConfig);
    fs.appendFileSync(path, content, { encoding: 'utf8' });
    writeLog(`Escritura finalizada`, "DEBUG", globalConfig);
}

/*
Format the date 2024-11-27T11:55:17.000Z to 2024-11-27 11:55:17
*/
function formatDate(date) {
    const originalDate = new Date(date);
    const formattedDate = originalDate.getFullYear() + '-' +
        String(originalDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(originalDate.getDate()).padStart(2, '0') + ' ' +
        String(originalDate.getHours()).padStart(2, '0') + ':' +
        String(originalDate.getMinutes()).padStart(2, '0') + ':' +
        String(originalDate.getSeconds()).padStart(2, '0');
    return (formattedDate);
}
function formatDateXslx(date) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const excelDate = (date - excelEpoch) / (24 * 60 * 60 * 1000);
    return excelDate;
}

function setEnvironment(env) {
    var environment = "";
    if (env) {
        environment = env;
    }
    else {
        while ((environment !== "dev") && (environment !== "pre") && (environment !== "prod")) {
            environment = prompt('Select an environment (DEV|PRE|PROD):').toLowerCase();
        }
    }
    switch (environment) {
        case "dev": {
            CONSTANTS.environment = 'DEV';
            CONSTANTS.apiBasePath = 'https://api-manager.scib.dev.corp/api';
            CONSTANTS.clientId = '09390a65-b121-4cd3-bbc4-bebe7a6500d0';
            CONSTANTS.clientSecret = '8c85d438-9d8c-43da-95d5-eaa6da74be65';
            break;
        }
        case "pre": {
            CONSTANTS.environment = 'PRE';
            CONSTANTS.apiBasePath = 'https://api-manager.scib.pre.corp/api';
            CONSTANTS.clientId = '7441a8ed-c07a-4a91-8ad3-d0f70f15c4ba';
            CONSTANTS.clientSecret = '17c5b260-865d-4353-97f7-b5d5c2b68a21';
            break;
        }
        case "prod": {
            CONSTANTS.environment = 'PROD';
            CONSTANTS.apiBasePath = 'https://api-manager.scib.gs.corp/api';
            CONSTANTS.clientId = '1537acf7-c942-4a15-bd76-3dcad80a7fbb';
            CONSTANTS.clientSecret = '6eb6c4fc-6eec-4719-9388-c0971edcd558';
            break;
        }
        default: {
            CONSTANTS.environment = 'DEV';
            CONSTANTS.apiBasePath = 'https://api-manager.scib.dev.corp/api';
            CONSTANTS.clientId = '09390a65-b121-4cd3-bbc4-bebe7a6500d0';
            CONSTANTS.clientSecret = '8c85d438-9d8c-43da-95d5-eaa6da74be65';
            break;
        }
            return (CONSTANTS);
    }
}

function getEnvironment(env) {
    var CONST = {
        workingPath: 'C:/00_API_Govern/GitHub/API Connect Tools/execution',
        environment: 'DEV',
        apiBasePath: 'https://api-manager.scib.dev.corp/api',
        clientId: '09390a65-b121-4cd3-bbc4-bebe7a6500d0',
        clientSecret: '8c85d438-9d8c-43da-95d5-eaa6da74be65'
    };
    writeLog(`ENV: ${env}`, "DEBUG2", CONST);
    var environment = "";
    if (env) {
        environment = env.toLowerCase();;
    }
    else {
        while ((environment !== "dev") && (environment !== "pre") && (environment !== "prod")) {
            environment = prompt('Select an environment (DEV|PRE|PROD):').toLowerCase();
        }
    }
    switch (environment) {
        case "dev": {
            CONST = {
                workingPath: CONSTANTS.workingPath,
                environment: 'DEV',
                apiBasePath: 'https://api-manager.scib.dev.corp/api',
                clientId: '09390a65-b121-4cd3-bbc4-bebe7a6500d0',
                clientSecret: '8c85d438-9d8c-43da-95d5-eaa6da74be65'
            }
            return (CONST);
        }
        case "pre": {
            CONST = {
                workingPath: CONSTANTS.workingPath,
                environment: 'PRE',
                apiBasePath: 'https://api-manager.scib.pre.corp/api',
                clientId: '7441a8ed-c07a-4a91-8ad3-d0f70f15c4ba',
                clientSecret: '17c5b260-865d-4353-97f7-b5d5c2b68a21'
            }
            return (CONST);
        }
        case "prod": {
            CONST = {
                workingPath: CONSTANTS.workingPath,
                environment: 'PROD',
                apiBasePath: 'https://api-manager.scib.gs.corp/api',
                clientId: '1537acf7-c942-4a15-bd76-3dcad80a7fbb',
                clientSecret: '6eb6c4fc-6eec-4719-9388-c0971edcd558'
            }
            return (CONST);
        }
        default: {
            CONST = {
                workingPath: CONSTANTS.workingPath,
                environment: 'DEV',
                apiBasePath: 'https://api-manager.scib.dev.corp/api',
                clientId: '09390a65-b121-4cd3-bbc4-bebe7a6500d0',
                clientSecret: '8c85d438-9d8c-43da-95d5-eaa6da74be65'
            }
        }
    }
}

function saveDataWithTemplateXlsx(data, sheetName) {
    fs.readFile(xlsxTemplatePath, function (err, templateData) {
        if (err) throw err;
        // Load the template
        var template = new xlsxTemplate(templateData);
        // Insert data into the template
        template.substitute(sheetName, { apis: data });
        // Get binary data
        var binaryData = template.generate({ type: 'nodebuffer' });
        // Save the file
        fs.writeFileSync(xlsxOutputPath, binaryData);
    });
}

function orderSettlementsByMonth(settlements) {
    return settlements.sort((a, b) => {
        const monthA = new Date(a.settlementMonth).getTime();
        const monthB = new Date(b.settlementMonth).getTime();
        return monthA - monthB;
    });
}

module.exports = {
    getConstants,
    setConstants,
    setEnvironment,
    writeLog,
    writeFile,
    englishDateValidation,
    appendFile,
    formatDate,
    formatDateXslx,
    getEnvironment,
    saveDataWithTemplateXlsx,
    orderSettlementsByMonth
};
