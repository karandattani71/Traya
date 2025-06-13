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

-- Get the user IDs for reference
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