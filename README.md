# Imdiyo Airline Flight Management System

A comprehensive flight booking management system built with NestJS, PostgreSQL, and TypeORM.

## Features

### User & Booking Management
- Search flights between locations on a specific date
- Book flights with seat class selection
- View booked flights
- Cancel flight bookings

### Flight Management
- Add flights with destinations and schedules
- Configure flight status (on-time, delayed, cancelled)
- Manage seat classes (Economy, Business, First Class)
- Handle seat availability

### Fare Management
- Add/update fares for flights and seat classes
- Dynamic fare calculation

## Technical Stack
- **Backend**: NestJS with Node.js 22
- **Database**: PostgreSQL 15
- **ORM**: TypeORM
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

## Getting Started

### Prerequisites
- Node.js 22+
- PostgreSQL 15+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up database:
   - Create a PostgreSQL database named `imdiyo_airline`
   - Create a `.env` file in the root directory with the following configuration:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_NAME=imdiyo_airline
   DB_SSL=false
   PORT=3000
   NODE_ENV=development
   ```

3. Run the application:
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### API Documentation
Once the server is running, visit `http://localhost:3000/api` for Swagger documentation.

## Database Schema

The system uses the following main entities:
- **User**: Customer information
- **Flight**: Flight details and schedules
- **SeatClass**: Available seat classes (Economy, Business, First)
- **Seat**: Individual seats on flights
- **Booking**: Flight bookings
- **Fare**: Pricing information

## Concurrency Handling

The system implements proper concurrency control to prevent:
- Double booking of seats
- Race conditions in seat allocation
- Inconsistent booking states

## API Endpoints

### Flights
- `GET /flights/search` - Search flights
- `POST /flights` - Create flight
- `PUT /flights/:id/status` - Update flight status

### Bookings
- `POST /bookings` - Create booking
- `GET /bookings/user/:userId` - Get user bookings
- `DELETE /bookings/:id` - Cancel booking

### Fares
- `POST /fares` - Create/update fare
- `GET /fares/flight/:flightId` - Get flight fares 