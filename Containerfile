# Stage: Build
FROM node:25-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build the Angular app for production
RUN npm run build -- --configuration production

# Stage: Serve
FROM nginx:alpine

# Copy the build output to the Nginx web directory
COPY --from=builder /app/dist/altoeditorclient /usr/share/nginx/html

# Add Nginx config for SPA routing (fallback to index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for the app
EXPOSE 80

# Run Nginx to serve the app
CMD ["nginx", "-g", "daemon off;"]
