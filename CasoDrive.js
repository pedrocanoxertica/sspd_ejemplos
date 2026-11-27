function subirArchivosEnBatch() {
  const carpetaId = "TU_ID_DE_CARPETA";
  const token = ScriptApp.getOAuthToken();
  
  // Ejemplo de datos a convertir en archivos
  const archivos = [
    { nombre: "archivo1.txt", contenido: "Hola mundo 1" },
    { nombre: "archivo2.txt", contenido: "Hola mundo 2" },
    { nombre: "archivo3.txt", contenido: "Hola mundo 3" }
  ];

  // 1. Construimos el arreglo de peticiones HTTP
  const peticiones = archivos.map(archivo => {
    const metadata = {
      name: archivo.nombre,
      parents: [carpetaId],
      mimeType: "text/plain"
    };

    // Formato multipart para enviar metadatos + contenido en una sola llamada
    const boundary = "-------314159265358979323846";
    const cuerpo = 
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `${archivo.contenido}\r\n` +
      `--${boundary}--`;

    return {
      url: "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      method: "post",
      contentType: `multipart/related; boundary=${boundary}`,
      headers: { Authorization: `Bearer ${token}` },
      payload: cuerpo,
      muteHttpExceptions: true
    };
  });

  // 2. Ejecutamos todas las subidas en paralelo
  const respuestas = UrlFetchApp.fetchAll(peticiones);
  
  respuestas.forEach((res, i) => {
    Logger.log(`Archivo ${i + 1}: Código ${res.getResponseCode()}`);
  });
}



/**---------------------------------------ejemplo dos------------------------------------------------------------*/
/*
{
  "timeZone": "America/Mexico_City",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
*/


function ejecutarBatchDrive() {
  // DriveApp.getRootFolder(); // Descomenta si no editas appsscript.json para forzar el scope de Drive
  
  const carpetaPadreId = "TU_ID_DE_CARPETA_PADRE";
  const token = ScriptApp.getOAuthToken();
  const boundary = "batch_limite_unico_12345";

  // Lista de carpetas que queremos crear
  const nombresCarpetas = ["Cliente_A", "Cliente_B", "Cliente_C"];

  // 1. Construimos el cuerpo multipart/mixed
  let cuerpoBatch = "";

  nombresCarpetas.forEach((nombre, index) => {
    const metadata = {
      name: nombre,
      mimeType: "application/vnd.google-apps.folder",
      parents: [carpetaPadreId]
    };

    cuerpoBatch += `--${boundary}\r\n`;
    cuerpoBatch += `Content-Type: application/http\r\n`;
    cuerpoBatch += `Content-ID: <item-${index + 1}>\r\n\r\n`;
    
    // Petición interna a la API v3 de Drive
    cuerpoBatch += `POST /drive/v3/files HTTP/1.1\r\n`;
    cuerpoBatch += `Content-Type: application/json; charset=UTF-8\r\n\r\n`;
    cuerpoBatch += `${JSON.stringify(metadata)}\r\n`;
  });

  cuerpoBatch += `--${boundary}--`;

  // 2. Enviamos el paquete completo en UNA sola llamada
  const opciones = {
    method: "post",
    contentType: `multipart/mixed; boundary=${boundary}`,
    headers: {
      Authorization: `Bearer ${token}`
    },
    payload: cuerpoBatch,
    muteHttpExceptions: true
  };

  const respuesta = UrlFetchApp.fetch("https://www.googleapis.com/batch/drive/v3", opciones);
  
  Logger.log("Código HTTP general: " + respuesta.getResponseCode());
  Logger.log("Respuesta cruda:\n" + respuesta.getContentText());
}

