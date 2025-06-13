-- ============================================================================
-- Imdiyo Airline Flight Management System - Initial Migration
-- This migration creates the database schema and inserts initial test data
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DROP TABLES IF EXISTS (for clean setup)
-- ============================================================================
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS fares CASCADE;
DROP TABLE IF EXISTS seats CASCADE;
DROP TABLE IF EXISTS flights CASCADE;
DROP TABLE IF EXISTS seat_classes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS flights_status_enum CASCADE;
DROP TYPE IF EXISTS seats_status_enum CASCADE;
DROP TYPE IF EXISTS bookings_status_enum CASCADE;
DROP TYPE IF EXISTS seat_classes_name_enum CASCADE;

-- ============================================================================
-- CREATE ENUMS
-- ============================================================================
CREATE TYPE seat_classes_name_enum AS ENUM (
    'economy',
    'business',
    'first'
);

CREATE TYPE flights_status_enum AS ENUM (
    'on_time',
    'delayed',
    'cancelled'
);

CREATE TYPE seats_status_enum AS ENUM (
    'available',
    'booked',
    'blocked'
);

CREATE TYPE bookings_status_enum AS ENUM (
    'confirmed',
    'cancelled',
    'pending'
);

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- Seat Classes Table
CREATE TABLE seat_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name seat_classes_name_enum NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    priority INTEGER NOT NULL
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    "dateOfBirth" DATE,
    gender VARCHAR(10),
    address TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Flights Table
CREATE TABLE flights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "flightNumber" VARCHAR(10) NOT NULL UNIQUE,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    "originCode" VARCHAR(10) NOT NULL,
    "destinationCode" VARCHAR(10) NOT NULL,
    "departureTime" TIMESTAMP NOT NULL,
    "arrivalTime" TIMESTAMP NOT NULL,
    aircraft VARCHAR(50) NOT NULL,
    status flights_status_enum NOT NULL DEFAULT 'on_time',
    "totalSeats" INTEGER NOT NULL DEFAULT 0,
    "availableSeats" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seats Table
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "seatNumber" VARCHAR(10) NOT NULL,
    status seats_status_enum NOT NULL DEFAULT 'available',
    "blockExpiresAt" TIMESTAMP,
    "blockedByUserId" UUID,
    row INTEGER NOT NULL,
    "column" VARCHAR(1) NOT NULL,
    "flightId" UUID NOT NULL,
    "seatClassId" UUID NOT NULL,
    CONSTRAINT fk_seats_flight FOREIGN KEY ("flightId") REFERENCES flights(id) ON DELETE CASCADE,
    CONSTRAINT fk_seats_seat_class FOREIGN KEY ("seatClassId") REFERENCES seat_classes(id),
    CONSTRAINT fk_seats_blocked_by_user FOREIGN KEY ("blockedByUserId") REFERENCES users(id),
    CONSTRAINT uq_seats_flight_number UNIQUE ("flightId", "seatNumber")
);

-- Fares Table
CREATE TABLE fares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "basePrice" DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) NOT NULL DEFAULT 0,
    "serviceFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP,
    "validTo" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "flightId" UUID NOT NULL,
    "seatClassId" UUID NOT NULL,
    CONSTRAINT fk_fares_flight FOREIGN KEY ("flightId") REFERENCES flights(id) ON DELETE CASCADE,
    CONSTRAINT fk_fares_seat_class FOREIGN KEY ("seatClassId") REFERENCES seat_classes(id),
    CONSTRAINT uq_fares_flight_seat_class UNIQUE ("flightId", "seatClassId")
);

-- Bookings Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bookingReference" VARCHAR(20) NOT NULL UNIQUE,
    status bookings_status_enum NOT NULL DEFAULT 'pending',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "passengerName" VARCHAR(100),
    "passengerEmail" VARCHAR(255),
    "passengerPhone" VARCHAR(15),
    "bookingDate" TIMESTAMP,
    "paymentDate" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "userId" UUID NOT NULL,
    "flightId" UUID NOT NULL,
    "seatId" UUID NOT NULL,
    CONSTRAINT fk_bookings_user FOREIGN KEY ("userId") REFERENCES users(id),
    CONSTRAINT fk_bookings_flight FOREIGN KEY ("flightId") REFERENCES flights(id),
    CONSTRAINT fk_bookings_seat FOREIGN KEY ("seatId") REFERENCES seats(id)
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_flights_flight_number ON flights("flightNumber");
CREATE INDEX idx_flights_departure_time ON flights("departureTime");
CREATE INDEX idx_seats_flight_id ON seats("flightId");
CREATE INDEX idx_seats_status ON seats(status);
CREATE INDEX idx_bookings_user_id ON bookings("userId");
CREATE INDEX idx_bookings_flight_id ON bookings("flightId");
CREATE INDEX idx_bookings_reference ON bookings("bookingReference");
CREATE INDEX idx_fares_flight_id ON fares("flightId");

-- ============================================================================
-- INSERT INITIAL DATA
-- ============================================================================

-- Seat Classes
INSERT INTO seat_classes (name, description, priority)
SELECT 'economy', 'Economy Class - Standard seating with basic amenities', 1
WHERE NOT EXISTS (
    SELECT 1 FROM seat_classes WHERE name = 'economy'
);

INSERT INTO seat_classes (name, description, priority)
SELECT 'business', 'Business Class - Premium seating with enhanced services', 2
WHERE NOT EXISTS (
    SELECT 1 FROM seat_classes WHERE name = 'business'
);

INSERT INTO seat_classes (name, description, priority)
SELECT 'first', 'First Class - Luxury seating with exclusive services', 3
WHERE NOT EXISTS (
    SELECT 1 FROM seat_classes WHERE name = 'first'
);

-- Users with bcrypt hashed password 'password123'
INSERT INTO users ("firstName", "lastName", email, password, phone, "dateOfBirth", gender, address, "createdAt", "updatedAt")
VALUES
('John', 'Doe', 'john.doe@example.com', '$2b$10$xbUFtw17x5gTBCeu7/L7Pe6hzG9i6zwC26YTOai5ksnDKRxlrZKHy', '+1234567890', '1990-01-01', 'male', '123 Main St, New York', NOW(), NOW()),
('Jane', 'Smith', 'jane.smith@example.com', '$2b$10$xbUFtw17x5gTBCeu7/L7Pe6hzG9i6zwC26YTOai5ksnDKRxlrZKHy', '+1234567891', '1992-05-15', 'female', '456 Park Ave, London', NOW(), NOW()),
('Bob', 'Wilson', 'bob.wilson@example.com', '$2b$10$xbUFtw17x5gTBCeu7/L7Pe6hzG9i6zwC26YTOai5ksnDKRxlrZKHy', '+1234567892', '1985-12-30', 'male', '789 Oak Rd, Paris', NOW(), NOW()),
('Alice', 'Johnson', 'alice.johnson@example.com', '$2b$10$xbUFtw17x5gTBCeu7/L7Pe6hzG9i6zwC26YTOai5ksnDKRxlrZKHy', '+1234567893', '1988-07-20', 'female', '321 Pine St, Dubai', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Flights, Seats, Fares, and Bookings using a single transaction block
DO $$
DECLARE
    john_id uuid;
    jane_id uuid;
    bob_id uuid;
    alice_id uuid;
    economy_id uuid;
    business_id uuid;
    first_id uuid;
    flight_ny_london_id uuid;
    flight_london_paris_id uuid;
    flight_paris_dubai_id uuid;
    flight_dubai_mumbai_id uuid;
    flight_mumbai_singapore_id uuid;
BEGIN
    -- Get User IDs
    SELECT id INTO john_id FROM users WHERE email = 'john.doe@example.com';
    SELECT id INTO jane_id FROM users WHERE email = 'jane.smith@example.com';
    SELECT id INTO bob_id FROM users WHERE email = 'bob.wilson@example.com';
    SELECT id INTO alice_id FROM users WHERE email = 'alice.johnson@example.com';
    
    -- Get Seat Class IDs
    SELECT id INTO economy_id FROM seat_classes WHERE name = 'economy';
    SELECT id INTO business_id FROM seat_classes WHERE name = 'business';
    SELECT id INTO first_id FROM seat_classes WHERE name = 'first';

    -- Insert Flights with various statuses and times
    INSERT INTO flights ("flightNumber", origin, destination, "originCode", "destinationCode", "departureTime", "arrivalTime", aircraft, status, "totalSeats", "availableSeats", "createdAt", "updatedAt")
    VALUES
    ('IM101', 'New York (JFK)', 'London (LHR)', 'JFK', 'LHR', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 7 hours', 'Boeing 787', 'on_time', 300, 280, NOW(), NOW()),
    ('IM102', 'London (LHR)', 'Paris (CDG)', 'LHR', 'CDG', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 2 hours', 'Airbus A320', 'delayed', 180, 150, NOW(), NOW()),
    ('IM103', 'Paris (CDG)', 'Dubai (DXB)', 'CDG', 'DXB', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 6 hours', 'Boeing 777', 'on_time', 400, 380, NOW(), NOW()),
    ('IM104', 'Dubai (DXB)', 'Mumbai (BOM)', 'DXB', 'BOM', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days 4 hours', 'Airbus A380', 'on_time', 500, 450, NOW(), NOW()),
    ('IM105', 'Mumbai (BOM)', 'Singapore (SIN)', 'BOM', 'SIN', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days 5 hours', 'Boeing 777', 'on_time', 350, 320, NOW(), NOW())
    ON CONFLICT ("flightNumber") DO NOTHING;

    -- Get Flight IDs
    SELECT id INTO flight_ny_london_id FROM flights WHERE "flightNumber" = 'IM101';
    SELECT id INTO flight_london_paris_id FROM flights WHERE "flightNumber" = 'IM102';
    SELECT id INTO flight_paris_dubai_id FROM flights WHERE "flightNumber" = 'IM103';
    SELECT id INTO flight_dubai_mumbai_id FROM flights WHERE "flightNumber" = 'IM104';
    SELECT id INTO flight_mumbai_singapore_id FROM flights WHERE "flightNumber" = 'IM105';

    -- Insert Seats with various states (available, blocked, booked)
    INSERT INTO seats ("seatNumber", status, "blockExpiresAt", "blockedByUserId", row, "column", "flightId", "seatClassId")
    VALUES
    -- Economy Class Seats (NY to London)
    ('10A', 'available', NULL, NULL, 10, 'A', flight_ny_london_id, economy_id),
    ('10B', 'booked', NULL, NULL, 10, 'B', flight_ny_london_id, economy_id),
    ('10C', 'blocked', NOW() + INTERVAL '8 minutes', jane_id, 10, 'C', flight_ny_london_id, economy_id),
    ('10D', 'blocked', NOW() - INTERVAL '2 minutes', bob_id, 10, 'D', flight_ny_london_id, economy_id), -- Expired block
    ('10E', 'available', NULL, NULL, 10, 'E', flight_ny_london_id, economy_id),
    ('10F', 'available', NULL, NULL, 10, 'F', flight_ny_london_id, economy_id),
    
    -- Business Class Seats (NY to London)
    ('2A', 'available', NULL, NULL, 2, 'A', flight_ny_london_id, business_id),
    ('2B', 'booked', NULL, NULL, 2, 'B', flight_ny_london_id, business_id),
    ('2C', 'blocked', NOW() + INTERVAL '5 minutes', alice_id, 2, 'C', flight_ny_london_id, business_id),
    ('2D', 'available', NULL, NULL, 2, 'D', flight_ny_london_id, business_id),
    
    -- First Class Seats (NY to London)
    ('1A', 'available', NULL, NULL, 1, 'A', flight_ny_london_id, first_id),
    ('1B', 'booked', NULL, NULL, 1, 'B', flight_ny_london_id, first_id),
    ('1C', 'blocked', NOW() + INTERVAL '9 minutes', john_id, 1, 'C', flight_ny_london_id, first_id),
    ('1D', 'available', NULL, NULL, 1, 'D', flight_ny_london_id, first_id),

    -- Economy Class Seats (London to Paris)
    ('15A', 'available', NULL, NULL, 15, 'A', flight_london_paris_id, economy_id),
    ('15B', 'blocked', NOW() + INTERVAL '7 minutes', bob_id, 15, 'B', flight_london_paris_id, economy_id),
    ('15C', 'booked', NULL, NULL, 15, 'C', flight_london_paris_id, economy_id);

    -- Insert Fares with different currencies and classes
    INSERT INTO fares ("basePrice", tax, "serviceFee", "totalPrice", currency, "isActive", "validFrom", "validTo", "flightId", "seatClassId", "createdAt", "updatedAt")
    VALUES
    -- NY to London Fares
    (500.00, 50.00, 25.00, 575.00, 'USD', true, NOW(), NOW() + INTERVAL '30 days', flight_ny_london_id, economy_id, NOW(), NOW()),
    (1200.00, 120.00, 60.00, 1380.00, 'USD', true, NOW(), NOW() + INTERVAL '30 days', flight_ny_london_id, business_id, NOW(), NOW()),
    (2500.00, 250.00, 125.00, 2875.00, 'USD', true, NOW(), NOW() + INTERVAL '30 days', flight_ny_london_id, first_id, NOW(), NOW()),
    
    -- London to Paris Fares
    (200.00, 20.00, 10.00, 230.00, 'EUR', true, NOW(), NOW() + INTERVAL '30 days', flight_london_paris_id, economy_id, NOW(), NOW()),
    (400.00, 40.00, 20.00, 460.00, 'EUR', true, NOW(), NOW() + INTERVAL '30 days', flight_london_paris_id, business_id, NOW(), NOW()),
    (800.00, 80.00, 40.00, 920.00, 'EUR', true, NOW(), NOW() + INTERVAL '30 days', flight_london_paris_id, first_id, NOW(), NOW()),
    
    -- Paris to Dubai Fares
    (600.00, 60.00, 30.00, 690.00, 'EUR', true, NOW(), NOW() + INTERVAL '30 days', flight_paris_dubai_id, economy_id, NOW(), NOW()),
    (1500.00, 150.00, 75.00, 1725.00, 'EUR', true, NOW(), NOW() + INTERVAL '30 days', flight_paris_dubai_id, business_id, NOW(), NOW()),
    (3000.00, 300.00, 150.00, 3450.00, 'EUR', true, NOW(), NOW() + INTERVAL '30 days', flight_paris_dubai_id, first_id, NOW(), NOW());

    -- Insert Bookings with different statuses
    INSERT INTO bookings ("bookingReference", status, "totalAmount", "passengerName", "passengerEmail", "passengerPhone", "bookingDate", "paymentDate", "userId", "flightId", "seatId", "createdAt", "updatedAt")
    SELECT
        'IM101ABC', -- Booking reference
        'confirmed'::bookings_status_enum, -- Status
        575.00, -- Total amount
        'John Doe', -- Passenger name
        'john.doe@example.com', -- Passenger email
        '+1234567890', -- Passenger phone
        NOW(), -- Booking date
        NOW(), -- Payment date
        john_id, -- User ID
        flight_ny_london_id, -- Flight ID
        id, -- Seat ID
        NOW(), -- Created at
        NOW() -- Updated at
    FROM seats 
    WHERE "seatNumber" = '10B' AND "flightId" = flight_ny_london_id
    UNION ALL
    SELECT
        'IM101DEF',
        'cancelled'::bookings_status_enum,
        1380.00,
        'Jane Smith',
        'jane.smith@example.com',
        '+1234567891',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day',
        jane_id,
        flight_ny_london_id,
        id,
        NOW(),
        NOW()
    FROM seats 
    WHERE "seatNumber" = '2B' AND "flightId" = flight_ny_london_id
    UNION ALL
    SELECT
        'IM101GHI',
        'pending'::bookings_status_enum,
        2875.00,
        'Bob Wilson',
        'bob.wilson@example.com',
        '+1234567892',
        NOW(),
        NULL,
        bob_id,
        flight_ny_london_id,
        id,
        NOW(),
        NOW()
    FROM seats 
    WHERE "seatNumber" = '1B' AND "flightId" = flight_ny_london_id
    ON CONFLICT ("bookingReference") DO NOTHING;

END $$; 

-- ============================================================================
-- CREATE TRIGGERS FOR UPDATED_AT COLUMNS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updatedAt columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flights_updated_at BEFORE UPDATE ON flights 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fares_updated_at BEFORE UPDATE ON fares 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES (Optional - can be removed in production)
-- ============================================================================

-- SELECT 'Migration completed successfully!' as status;
-- SELECT 'Seat Classes:' as info, COUNT(*) as count FROM seat_classes;
-- SELECT 'Users:' as info, COUNT(*) as count FROM users;
-- SELECT 'Flights:' as info, COUNT(*) as count FROM flights;
-- SELECT 'Seats:' as info, COUNT(*) as count FROM seats;
-- SELECT 'Fares:' as info, COUNT(*) as count FROM fares;
-- SELECT 'Bookings:' as info, COUNT(*) as count FROM bookings; 