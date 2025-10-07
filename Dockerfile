# Usa una imagen oficial de Node.js como base
FROM node:18

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias
COPY package.json package-lock.json* ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos de la aplicación
COPY . .

# Crea los directorios necesarios si no existen
RUN mkdir -p logs tmp data

# Expone el puerto en el que la aplicación escucha
EXPOSE 8827

# Comando para ejecutar tu aplicación (ajusta el archivo principal si es necesario)
CMD ["node", "index.js"]