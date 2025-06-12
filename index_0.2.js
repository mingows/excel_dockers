var { writeFile} = require('./utils.js');
var request = require('request');
var path = require('path');

var options = {
  'method': 'GET',
  'url': 'https://www.cmegroup.com/CmeWS/mvc/Settlements/Futures/Settlements/4708/FUT?strategy=DEFAULT&tradeDate=05/19/2025&pageSize=500&isProtected&_t=1747732336411',
  'headers': {
    'accept': 'application/json',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6',
  },
  gzip: true, // Solicita y maneja descompresión gzip
  json: true   // Parsea automáticamente la respuesta como JSON
};

// Con las opciones gzip:true y json:true, el tercer argumento 'body' será el objeto JSON parseado.
request(options, function (error, response, body) {
    // 1. Manejar errores de la petición (ej. red, DNS)
    if (error) {
        console.error('Error al realizar la petición:', error.message);
        return; // Salir si hay un error
    }

    // 2. Verificar el código de estado HTTP
    // Un Content-Type incorrecto o un cuerpo no JSON pueden causar que 'body' no sea el objeto esperado,
    // incluso si json:true está configurado. 'request' podría poner un error en 'body'.
    if (response.statusCode < 200 || response.statusCode >= 300) {
        console.error('La petición no fue exitosa. Código de estado:', response.statusCode);
        console.error('Cuerpo de la respuesta (error):', body); // El cuerpo podría contener detalles del error del servidor
        return; // Salir si la respuesta no es exitosa
    }

    // 3. Si todo fue bien, 'body' ya es el objeto JSON parseado.
    if (typeof body === 'object' && body !== null) {
        console.log('Respuesta JSON obtenida:');
        // Escribir en fichero la respuesta
        const currentPath = __dirname;
        //writeFile(__dirname+"/tmp/data#01.json", responseBody, globalConfig);
        writeFile(__dirname+"/tmp/data#01.json", JSON.stringify(body, null, 2), "globalConfig");
        console.log(JSON.stringify(body, null, 2)); // Imprimir JSON formateado para legibilidad
    } else {
        console.warn('La respuesta no parece ser un JSON válido, aunque el estado fue exitoso.');
        console.log('Cuerpo de la respuesta (raw):', body);
    }
});
