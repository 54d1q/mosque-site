# Use Node.js 20 (Stable)
FROM node:20

# Create app directory
WORKDIR /app

# Copy all your files (Frontend and Backend)
COPY . .

# Go into backend and install the tools
WORKDIR /app/backend
RUN npm install

# Expose the port your app runs on
EXPOSE 3000

# Start the server
CMD ["npm", "start"]