# Base image
FROM node:18-alpine

# Install pnpm and PostgreSQL client
RUN npm install -g pnpm
RUN apk add --no-cache postgresql-client

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Bundle app source
COPY . .

# Build the application
RUN pnpm build

# Expose port
EXPOSE 3000

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /usr/src/app
USER nestjs

# Start the application with database wait
CMD ["sh", "-c", "until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME; do echo 'Waiting for database...'; sleep 2; done && echo 'Database is ready!' && pnpm start:prod"] 