# Imdiyo Airline Flight Management System

A comprehensive flight booking management system built with NestJS, PostgreSQL, and TypeORM.

## Features

### User & Booking Management
- User authentication with JWT
- Search flights between locations on a specific date
- Book flights with seat class selection
- Seat blocking mechanism to prevent double bookings
- View booked flights with detailed information
- Cancel flight bookings

### Flight Management
- Add flights with destinations and schedules
- Configure flight status (on-time, delayed, cancelled)
- Manage seat classes (Economy, Business, First Class)
- Handle seat availability and blocking
- Real-time seat status updates

### Fare Management
- Add/update fares for flights and seat classes
- Dynamic fare calculation with taxes and service fees
- Multi-currency support (USD, EUR)

### Concurrency Control
- Seat blocking mechanism with expiration
- Race condition prevention
- Atomic booking operations

## Technical Stack
- **Backend**: NestJS with Node.js 22
- **Database**: PostgreSQL 15
- **ORM**: TypeORM
- **Authentication**: JWT with Passport
- **Password Hashing**: bcrypt
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

## Getting Started

### Prerequisites
- Node.js 22+
- PostgreSQL 15+
- pnpm (recommended) or npm

### Installation

1. Clone the repository and install dependencies:
```bash
pnpm install
# or
npm install
```

2. Set up environment variables:
   Copy the example environment file and configure it:
   ```bash
   # Copy the example file
   cp env.example .env
   
   # Edit the .env file with your actual values
   # Update DB_PASSWORD with your PostgreSQL password
   # Change JWT_SECRET to a secure random string
   ```
   
   Your `.env` file should contain:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_actual_password
   DB_NAME=imdiyo_airline
   DB_SSL=false

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h

   # Application Configuration
   PORT=3000
   NODE_ENV=development
   ```

3. Create the PostgreSQL database:
   ```sql
   CREATE DATABASE imdiyo_airline;
   ```

4. Run the initial migration to set up the database schema and test data:
   ```bash
   pnpm migration:run
   # or
   npm run migration:run
   ```

5. Start the application:
   ```bash
   # Development
   pnpm start:dev
   # or
   npm run start:dev

   # Production
   pnpm build && pnpm start:prod
   # or
   npm run build && npm run start:prod
   ```

### API Documentation
Once the server is running, visit `http://localhost:3000/api` for Swagger documentation.

## Test Users

The migration creates 4 test users that you can use immediately:

| Name | Email | Password | Phone |
|------|-------|----------|-------|
| John Doe | john.doe@example.com | password123 | +1234567890 |
| Jane Smith | jane.smith@example.com | password123 | +1234567891 |
| Bob Wilson | bob.wilson@example.com | password123 | +1234567892 |
| Alice Johnson | alice.johnson@example.com | password123 | +1234567893 |

**Login Example:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

## Sample Data

The migration also creates:
- **3 Seat Classes**: Economy, Business, First Class
- **5 Sample Flights**: Various routes with different statuses
- **Sample Seats**: With different statuses (available, booked, blocked)
- **Sample Fares**: Multi-currency pricing (USD, EUR)
- **Sample Bookings**: Different booking statuses for testing

## Database Schema

The system uses the following main entities:

### Core Entities
- **User**: Customer information and authentication
- **Flight**: Flight details, schedules, and status
- **SeatClass**: Available seat classes with priorities
- **Seat**: Individual seats with blocking mechanism
- **Booking**: Flight bookings with status tracking
- **Fare**: Dynamic pricing with taxes and fees

### Key Features
- **UUID Primary Keys**: For better security and scalability
- **Enum Types**: For consistent status values
- **Foreign Key Constraints**: Data integrity enforcement
- **Indexes**: Optimized query performance
- **Triggers**: Automatic timestamp updates

## Migration System

### Available Commands
```bash
# Run initial migration (creates schema + test data)
pnpm migration:run

# Alternative command
pnpm migration:setup
```

### Migration Files
- `src/database/migrations/001-initial-schema-and-data.sql` - Complete schema and test data
- `run-migration.js` - Migration runner script

## Concurrency Handling

The system implements robust concurrency control:

### Seat Blocking Mechanism
- Seats are temporarily blocked during booking process
- Configurable block expiration (default: 10 minutes)
- Automatic cleanup of expired blocks
- Prevention of double bookings

### Race Condition Prevention
- Database-level constraints
- Atomic transactions
- Optimistic locking where appropriate

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Flights
- `GET /flights/search` - Search flights by route and date
- `POST /flights` - Create new flight
- `PUT /flights/:id/status` - Update flight status
- `GET /flights/:id/seats` - Get flight seat map

### Bookings
- `POST /bookings` - Create new booking
- `GET /bookings/user/:userId` - Get user's bookings
- `PUT /bookings/:id/cancel` - Cancel booking
- `GET /bookings/:id` - Get booking details

### Seats
- `POST /seats/block` - Block seats for booking
- `POST /seats/unblock` - Release blocked seats
- `GET /seats/flight/:flightId` - Get available seats

### Fares
- `POST /fares` - Create/update fare
- `GET /fares/flight/:flightId` - Get flight fares
- `POST /fares/calculate` - Calculate total fare

## Development

### Running Tests
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

### Code Quality
```bash
# Linting
pnpm lint

# Formatting
pnpm format
```

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Use proper PostgreSQL credentials
3. Set a strong `JWT_SECRET`
4. Enable SSL for database connections if needed
5. Run migrations before starting the application

## Troubleshooting

### Environment Setup
- Copy the example file: `cp env.example .env` (Linux/Mac) or `copy env.example .env` (Windows)
- Ensure all required environment variables are set
- Use a strong, unique JWT_SECRET in production

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists: `CREATE DATABASE imdiyo_airline;`
- Test connection: `psql -h localhost -U postgres -d imdiyo_airline`

### Migration Issues
- Ensure database exists before running migration
- Check file permissions on migration files
- Verify `.env` file configuration
- Make sure `env.example` was copied to `.env`

## License

This project is licensed under the UNLICENSED License. 