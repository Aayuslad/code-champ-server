# Use an official Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the root package.json and package-lock.json
COPY package.json package-lock.json ./

# Install root dependencies
RUN npm install

# Copy the server-specific package.json
COPY ./apps/server/package.json ./apps/server/

# Copy the rest of the server application files 
COPY ./apps/server ./apps/server

# Change working directory to server
WORKDIR /app/apps/server

# Install server-specific dependencies
RUN npm install

# Change back to the root directory
WORKDIR /app

# Copy the packages directory   
COPY ./packages ./

# Copy the .env file for environment variables
COPY ./apps/server/.env ./apps/server/.env

# Expose the port the server will run on (change 8080 if needed)
EXPOSE 8080

# Command to start the development server with hot-reloading
CMD ["npm", "run", "dev", "--prefix", "apps/server"]
