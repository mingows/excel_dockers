var { globalOrchestrator } = require('./orchestrator.js');
var { writeLog, getConstants } = require('./utils.js');

const express = require('express');
const APP = express();
const PORT = 8827;
var globalConfig = JSON.parse(getConstants());

APP.use(express.json());

APP.post('/marquis/book', (req, res) => {
    const { date } = req.body;
    var result = "";

    if (!date) {
        //writeLog("No date, so getting the day before", "INFO", globalConfig);
        try{
        result = globalOrchestrator(date, globalConfig);
        }
        catch (error) {
            writeLog(`Error in globalOrchestrator: ${error.message}`, "ERROR", globalConfig);
            return res.status(500).json({ error: "Internal server error" });
        };
        //return res.status(400).json({ error: "Se requiere una fecha en el formato {date: 'MM/DD/YYYY'}" });
        res.status(201).json({
            message: "Data in Excel files for the day before today.",
            details: result
        });
    } else {
        const fechaSolicitud = new Date(date);
        const fechaCompleta = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
        try{
        globalOrchestrator(date, globalConfig);
        }
        catch (error) {
            writeLog(`Error in globalOrchestrator: ${error.message}`, "ERROR", globalConfig);
            return res.status(500).json({ error: "Internal server error" });
        };
        //res.json({ mensaje: `Hola mundo en el día ${fechaSolicitud.toLocaleDateString('es-ES')}. Son las ${fechaCompleta}` });
        res.status(201).json({
            message: "Getting the given day " + fechaSolicitud.toLocaleDateString('es-ES'),
            details: result
        });
    }
});

APP.listen(PORT, () => {
    writeLog(`Listening on http://localhost:${PORT}/marquis/book`, "INFO", globalConfig);
});