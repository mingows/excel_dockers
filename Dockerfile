# Usa una imagen base oficial de Node.js. Alpine Linux es una buena opción por su tamaño reducido.
# Escoge una versión LTS de Node, por ejemplo, Node 20.
FROM node:20-alpine AS builder

# Establece el entorno a producción (puede optimizar la instalación de dependencias)
ENV NODE_ENV=production

# Crea y establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia package.json y package-lock.json (si existe) para aprovechar el caché de Docker
# Esto evita reinstalar dependencias si no han cambiado estos archivos.
COPY package*.json ./

# Instala las dependencias de producción. `npm ci` es preferible si tienes un package-lock.json.
# Si no, usa `npm install --only=production`.
RUN npm ci --only=production

# Copia el resto del código de la aplicación al directorio de trabajo
COPY . .

# Crea los directorios que tu aplicación podría necesitar en tiempo de ejecución si no los crea ella misma.
# Esto asegura que la aplicación no falle si intenta escribir en un directorio no existente.
RUN mkdir -p logs tmp data

# Expone el puerto en el que la aplicación escucha
EXPOSE 8827

# Define el comando para ejecutar la aplicación cuando el contenedor se inicie
CMD [ "node", "index.js" ]