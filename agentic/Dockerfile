FROM node:18-alpine

WORKDIR /app

# Copy package definition
COPY package.json tsconfig.json ./

# Install dependencies
# In a real build, we'd run npm install. 
# For this structure, we assume we are inside /agentic context
RUN npm install

# Copy source code
COPY . .

# Copy configuration (assuming build context root has access or we copy from outside)
# Since context is usually ./agentic, we need to handle this carefully.
# We will assume we copy the config folder into ./agentic/config BEFORE build or use a context that allows it.
# For now, let's assume we copy to ./config inside the image.
COPY config/ ./config/

# Build the project
RUN npm run build

# Create log directories
RUN mkdir -p /app/logs/audit && chmod 777 /app/logs

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
