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
    try {
        result = globalOrchestrator(date, globalConfig);
    }
    catch (error) {
        writeLog(`Error in globalOrchestrator: ${error.message}`, "ERROR", globalConfig);
        return res.status(500).json({ error: "Internal server error" });
    };
    if (!date) {
        fechaSolicitud = new Date();
        fechaSolicitud.setDate(fechaSolicitud.getDate() - 1); // yesterday
    } else {
        fechaSolicitud = new Date(date);
    }
    res.status(result.statusCode).json({
        message: "Getting the given day " + fechaSolicitud.toLocaleDateString('es-ES'),
        details: result
    });
});

APP.get('/marquis/version', (req, res) => {
    return res.status(200).json({ version: "1.0.0" });
});


APP.listen(PORT, () => {
    writeLog(`Listening on http://localhost:${PORT}/marquis/book`, "INFO", globalConfig);
    writeLog(`Body formar {"date":"MM/DD/YYYY"}`, "INFO", globalConfig);
});