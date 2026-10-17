# Use Node.js to built the frontend assets
FROM node:24-alpine AS build

# Set /app as the working directory inside the container
WORKDIR /app

# Copy package files first so dependency installation can be cached
COPY package*.json ./

# Install dependencies exactly as recorded in package-lock.json
RUN npm ci 

# Copy the frontend source code into the container
COPY . . 

# Set the API URL that the browser will use in the built app 
ARG VITE_API_URL=http://localhost:5001
ENV VITE_API_URL=$VITE_API_URL

# Create the production frontend files in /app/dist
RUN npm run build

# Use Nginx to serve the built frontend
FROM nginx:alpine 

# Configure Nginx to support react router paths 
COPY nginx.conf /etc/nginx/conf.d/default.conf


# Copy the built frontend files from the build stage into Nginx's web directory.
COPY --from=build /app/dist /usr/share/nginx/html

# Document the port Nginx listens on inside the container.
EXPOSE 80

# Keep Nginx running in the foreground so the container stays alive.
CMD ["nginx", "-g", "daemon off;"]