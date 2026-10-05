# Start from the official Node.js 24 image with Alpine Linux
FROM node:24-alpine

# Set /app as the working directory inside the container
WORKDIR /app 

# Copy the backend package files into the container
COPY package*.json ./

# Install production dependencies using lockfile
RUN npm ci --omit=dev

# Copy the rest of backend source code into the container
COPY . .

# Document that the backend listens on port 5001 inside the container
EXPOSE 5001

# Run the backend server when the container starts
CMD ["node", "server.js"]