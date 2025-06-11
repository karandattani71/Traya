# Testing Concurrency in Flight Booking System

This document provides examples of how to test the concurrency handling in the Imdiyo Airline Flight Management System.

## Concurrent Booking Test

The system uses database transactions with pessimistic locking to prevent double booking of seats. Here's how to test it:

### 1. Create Test Data

First, create a user, flight, and ensure seat classes exist:

```bash
# Create a user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890"
  }'

# Create a flight
curl -X POST http://localhost:3000/flights \
  -H "Content-Type: application/json" \
  -d '{
    "flightNumber": "IMD001",
    "origin": "New York",
    "destination": "Los Angeles",
    "departureTime": "2024-12-25T10:00:00Z",
    "arrivalTime": "2024-12-25T13:00:00Z",
    "aircraft": "Boeing 737",
    "totalSeats": 150
  }'

# Create fares for the flight (get seat class IDs first)
curl -X GET http://localhost:3000/seat-classes

# Create economy fare
curl -X POST http://localhost:3000/fares \
  -H "Content-Type: application/json" \
  -d '{
    "flightId": "FLIGHT_ID_HERE",
    "seatClassId": "ECONOMY_SEAT_CLASS_ID_HERE",
    "basePrice": 299.99,
    "tax": 30.00,
    "serviceFee": 15.00
  }'
```

### 2. Test Concurrent Booking

To test concurrent booking, you can use tools like Apache Bench or write a simple script:

```bash
# Get available seats for the flight
curl -X GET http://localhost:3000/flights/FLIGHT_ID_HERE/seats

# Try to book the same seat simultaneously (this should fail for one request)
# Request 1:
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "flightId": "FLIGHT_ID_HERE",
    "seatId": "SEAT_ID_HERE",
    "passengerName": "John Doe",
    "passengerEmail": "john.doe@example.com",
    "passengerPhone": "+1234567890"
  }' &

# Request 2 (run simultaneously):
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "flightId": "FLIGHT_ID_HERE",
    "seatId": "SAME_SEAT_ID_HERE",
    "passengerName": "Jane Smith",
    "passengerEmail": "jane.smith@example.com",
    "passengerPhone": "+1234567891"
  }' &
```

### Expected Behavior

- **First request**: Should succeed and return a booking confirmation
- **Second request**: Should fail with a 409 Conflict error: "Seat is no longer available"
- **Database consistency**: Only one booking should exist for the seat
- **Flight availability**: Available seats count should decrease by 1

### 3. Test Booking Cancellation

```bash
# Cancel a booking
curl -X DELETE http://localhost:3000/bookings/BOOKING_ID_HERE

# Verify seat is available again
curl -X GET http://localhost:3000/flights/FLIGHT_ID_HERE/seats

# Verify flight available seats count increased
curl -X GET http://localhost:3000/flights/FLIGHT_ID_HERE
```

## Load Testing

For more comprehensive concurrency testing, use tools like:

### Apache Bench Example
```bash
# Create 100 concurrent booking requests
ab -n 100 -c 10 -p booking-data.json -T application/json \
  http://localhost:3000/bookings
```

### Artillery Example
```yaml
# artillery-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 30
      arrivalRate: 10
scenarios:
  - name: 'Concurrent Booking'
    requests:
      - post:
          url: '/bookings'
          json:
            userId: 'USER_ID_HERE'
            flightId: 'FLIGHT_ID_HERE'
            seatId: 'SEAT_ID_HERE'
            passengerName: 'Test User'
            passengerEmail: 'test@example.com'
```

## Key Concurrency Features

1. **Pessimistic Locking**: Database-level locking prevents race conditions
2. **Transaction Isolation**: All booking operations are atomic
3. **Constraint Validation**: Database constraints prevent data inconsistency
4. **Error Handling**: Proper HTTP status codes for concurrent access issues
5. **Seat Status Management**: Real-time seat availability updates

## Monitoring

Monitor the following during concurrency tests:
- Database connection pool usage
- Transaction rollback rates
- Response times under load
- Error rates and types
- Seat booking accuracy 