import { Injectable, NotFoundException, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Booking, BookingStatus, User, Flight, Seat, SeatStatus, Fare } from '../entities';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CalculateFareDto } from './dto/calculate-fare.dto';
import { SeatBlockService } from '../seats/seat-block.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Flight)
    private flightsRepository: Repository<Flight>,
    @InjectRepository(Seat)
    private seatsRepository: Repository<Seat>,
    @InjectRepository(Fare)
    private faresRepository: Repository<Fare>,
    private dataSource: DataSource,
    private seatBlockService: SeatBlockService,
  ) {}

  async create(createBookingDto: CreateBookingDto) {
    // Validate userId is present
    if (!createBookingDto.userId) {
      throw new BadRequestException('User ID is required for booking');
    }

    // Validate that we have at least one passenger
    if (!createBookingDto.passengers || createBookingDto.passengers.length === 0) {
      throw new BadRequestException('At least one passenger is required');
    }

    // If single passenger, return single booking object for backward compatibility
    if (createBookingDto.passengers.length === 1) {
      return this.createSingleBooking(createBookingDto);
    }

    // Multiple passengers - return array of bookings
    return this.createMultipleBookings(createBookingDto);
  }

  private async createSingleBooking(createBookingDto: CreateBookingDto): Promise<Booking> {
    const passenger = createBookingDto.passengers[0];

    // First verify that the seat is blocked by the current user
    const seat = await this.seatsRepository.findOne({
      where: { id: passenger.seatId },
      relations: ['seatClass'],
    });

    if (!seat) {
      throw new NotFoundException('Seat not found');
    }

    if (seat.status !== SeatStatus.BLOCKED) {
      throw new BadRequestException('Seat must be blocked before booking. Please block the seat first.');
    }

    if (seat.blockedByUserId !== createBookingDto.userId) {
      throw new UnauthorizedException('You can only book seats that you have blocked yourself.');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        // Check if the user exists
        const user = await manager.findOne(User, {
          where: { id: createBookingDto.userId },
        });

        if (!user) {
          throw new NotFoundException('User not found');
        }

        // Check and lock the flight
        const flight = await manager.findOne(Flight, {
          where: { id: createBookingDto.flightId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!flight) {
          throw new NotFoundException('Flight not found');
        }

        if (flight.availableSeats <= 0) {
          throw new ConflictException('No seats available on this flight');
        }

        // Get and lock the seat, with its relationships
        const lockedSeat = await manager
          .createQueryBuilder(Seat, 'seat')
          .setLock('pessimistic_write')
          .innerJoinAndSelect('seat.seatClass', 'seatClass')
          .where('seat.id = :seatId', { seatId: passenger.seatId })
          .getOne();

        if (!lockedSeat) {
          throw new NotFoundException('Seat not found');
        }

        if (lockedSeat.status === SeatStatus.BOOKED) {
          throw new ConflictException('Seat is already booked');
        }

        // Double-check that the seat is still blocked by the same user
        if (lockedSeat.status !== SeatStatus.BLOCKED || lockedSeat.blockedByUserId !== createBookingDto.userId) {
          throw new UnauthorizedException('Seat is no longer blocked by you. Please block the seat again.');
        }

        // Get fare for the seat class
        const fare = await manager.findOne(Fare, {
          where: {
            flightId: flight.id,
            seatClassId: lockedSeat.seatClass.id,
            isActive: true,
          },
        });

        if (!fare) {
          throw new NotFoundException('Fare not found for the selected seat class');
        }

        // Generate booking reference
        const bookingReference = `IM${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Create the booking
        const booking = manager.create(Booking, {
          bookingReference,
          userId: createBookingDto.userId,
          flightId: createBookingDto.flightId,
          seatId: passenger.seatId,
          passengerName: passenger.passengerName,
          passengerEmail: passenger.passengerEmail,
          passengerPhone: passenger.passengerPhone,
          totalAmount: fare.totalPrice,
          status: BookingStatus.CONFIRMED,
          bookingDate: new Date(),
          paymentDate: new Date(),
        });

        const savedBooking = await manager.save(Booking, booking);

        // Update seat status
        await manager.update(Seat, lockedSeat.id, { 
          status: SeatStatus.BOOKED,
          blockExpiresAt: null,
          blockedByUserId: null
        });

        // Update flight available seats
        await manager.decrement(Flight, { id: flight.id }, 'availableSeats', 1);

        // Return booking with relations
        return manager.findOne(Booking, {
          where: { id: savedBooking.id },
          relations: ['user', 'flight', 'seat', 'seat.seatClass'],
        });
      });
    } catch (error) {
      // If anything fails, unblock the seat (only if it was blocked by this user)
      if (seat.blockedByUserId === createBookingDto.userId) {
        await this.seatBlockService.unblockSeat(passenger.seatId, createBookingDto.userId);
      }
      throw error;
    }
  }

  private async createMultipleBookings(createBookingDto: CreateBookingDto) {
    // First calculate the fare to validate everything
    const fareCalculation = await this.calculateFare({
      flightId: createBookingDto.flightId,
      seats: createBookingDto.passengers.map(p => ({
        seatId: p.seatId,
        passengerName: p.passengerName
      }))
    });

    // Validate user exists
    const user = await this.usersRepository.findOne({
      where: { id: createBookingDto.userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check that all seats are blocked by this user
    const seatIds = createBookingDto.passengers.map(p => p.seatId);
    const seats = await this.seatsRepository.find({
      where: { id: In(seatIds) }
    });

    const notBlockedByUser = seats.filter(seat => 
      seat.status !== SeatStatus.BLOCKED || seat.blockedByUserId !== createBookingDto.userId
    );

    if (notBlockedByUser.length > 0) {
      throw new BadRequestException(
        `Seats ${notBlockedByUser.map(s => s.seatNumber).join(', ')} must be blocked by you before booking`
      );
    }

    // Create bookings in transaction
    return await this.dataSource.transaction(async (manager) => {
      const bookings = [];
      const bookingReference = `IM${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      for (let i = 0; i < createBookingDto.passengers.length; i++) {
        const passenger = createBookingDto.passengers[i];
        const seatDetail = fareCalculation.seatDetails[i];

        // Create individual booking for each passenger
        const booking = manager.create(Booking, {
          bookingReference: `${bookingReference}-${i + 1}`, // Add suffix for multiple bookings
          userId: createBookingDto.userId,
          flightId: createBookingDto.flightId,
          seatId: passenger.seatId,
          passengerName: passenger.passengerName,
          passengerEmail: passenger.passengerEmail,
          passengerPhone: passenger.passengerPhone,
          totalAmount: seatDetail.fare.totalPrice,
          status: BookingStatus.CONFIRMED,
          bookingDate: new Date(),
          paymentDate: new Date(),
        });

        const savedBooking = await manager.save(Booking, booking);
        bookings.push(savedBooking);

        // Update seat status
        await manager.update(Seat, passenger.seatId, { 
          status: SeatStatus.BOOKED,
          blockExpiresAt: null,
          blockedByUserId: null
        });
      }

      // Update flight available seats
      await manager.decrement(Flight, { id: createBookingDto.flightId }, 'availableSeats', bookings.length);

      // Return bookings with relations
      const bookingsWithRelations = await Promise.all(
        bookings.map(booking => 
          manager.findOne(Booking, {
            where: { id: booking.id },
            relations: ['user', 'flight', 'seat', 'seat.seatClass'],
          })
        )
      );

      return {
        bookingReference: bookingReference,
        bookings: bookingsWithRelations,
        totalAmount: fareCalculation.summary.totalAmount,
        totalSeats: bookings.length,
        summary: fareCalculation.summary
      };
    });
  }

  async findAll(): Promise<Booking[]> {
    return this.bookingsRepository.find({
      relations: ['user', 'flight', 'seat', 'seat.seatClass'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: ['user', 'flight', 'seat', 'seat.seatClass'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async findByUser(userId: string): Promise<Booking[]> {
    // Verify user exists
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.bookingsRepository.find({
      where: { userId },
      relations: ['flight', 'seat', 'seat.seatClass'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByBookingReference(bookingReference: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { bookingReference },
      relations: ['user', 'flight', 'seat', 'seat.seatClass'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async cancel(id: string): Promise<Booking> {
    return this.dataSource.transaction(async (manager) => {
      // Use createQueryBuilder with inner joins instead of findOne
      const booking = await manager
        .createQueryBuilder(Booking, 'booking')
        .innerJoinAndSelect('booking.flight', 'flight')
        .innerJoinAndSelect('booking.seat', 'seat')
        .where('booking.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw new BadRequestException('Booking is already cancelled');
      }

      const now = new Date();
      if (booking.flight.departureTime < now) {
        throw new BadRequestException('Cannot cancel booking for departed flights');
      }

      // Update booking status
      await manager.update(Booking, id, { status: BookingStatus.CANCELLED });

      // Release the seat
      await manager.update(Seat, booking.seatId, { 
        status: SeatStatus.AVAILABLE,
        blockExpiresAt: null,
        blockedByUserId: null
      });

      // Update flight available seats
      await manager.increment(Flight, { id: booking.flightId }, 'availableSeats', 1);

      // Return updated booking with all relations
      return manager
        .createQueryBuilder(Booking, 'booking')
        .innerJoinAndSelect('booking.flight', 'flight')
        .innerJoinAndSelect('booking.seat', 'seat')
        .innerJoinAndSelect('booking.user', 'user')
        .innerJoinAndSelect('seat.seatClass', 'seatClass')
        .where('booking.id = :id', { id })
        .getOne();
    });
  }

  async remove(id: string): Promise<void> {
    const booking = await this.findOne(id);
    
    // Cancel the booking first to release resources
    if (booking.status !== BookingStatus.CANCELLED) {
      await this.cancel(id);
    }

    await this.bookingsRepository.remove(booking);
  }

  private generateBookingReference(): string {
    // Generate a unique booking reference (e.g., IMD-XXXXXXXX)
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomString = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `IMD-${timestamp}${randomString}`;
  }

  async calculateFare(calculateFareDto: CalculateFareDto) {
    // Validate flight exists
    const flight = await this.flightsRepository.findOne({
      where: { id: calculateFareDto.flightId },
      relations: ['fares', 'fares.seatClass']
    });

    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    const seatDetails = [];
    let totalAmount = 0;
    const seatIds = calculateFareDto.seats.map(s => s.seatId);

    // Get all seats with their classes and fares
    const seats = await this.seatsRepository.find({
      where: { id: In(seatIds) },
      relations: ['seatClass']
    });

    if (seats.length !== calculateFareDto.seats.length) {
      throw new NotFoundException('One or more seats not found');
    }

    // Validate all seats belong to the same flight
    const invalidSeats = seats.filter(seat => seat.flightId !== calculateFareDto.flightId);
    if (invalidSeats.length > 0) {
      throw new BadRequestException('All seats must belong to the specified flight');
    }

    // Check seat availability (allow both AVAILABLE and BLOCKED seats for fare calculation)
    const unavailableSeats = seats.filter(seat => 
      seat.status !== SeatStatus.AVAILABLE && seat.status !== SeatStatus.BLOCKED
    );
    if (unavailableSeats.length > 0) {
      throw new ConflictException(`Seats ${unavailableSeats.map(s => s.seatNumber).join(', ')} are not available`);
    }

    // Calculate fare for each seat
    for (const seatSelection of calculateFareDto.seats) {
      const seat = seats.find(s => s.id === seatSelection.seatId);
      const fare = flight.fares.find(f => f.seatClassId === seat.seatClassId && f.isActive);

      if (!fare) {
        throw new NotFoundException(`No active fare found for seat ${seat.seatNumber} (${seat.seatClass.name} class)`);
      }

      const seatDetail = {
        seatId: seat.id,
        seatNumber: seat.seatNumber,
        seatClass: {
          id: seat.seatClass.id,
          name: seat.seatClass.name,
          description: seat.seatClass.description
        },
        passengerName: seatSelection.passengerName,
        fare: {
          basePrice: parseFloat(fare.basePrice.toString()),
          tax: parseFloat(fare.tax.toString()),
          serviceFee: parseFloat(fare.serviceFee.toString()),
          totalPrice: parseFloat(fare.totalPrice.toString()),
          currency: fare.currency
        }
      };

      seatDetails.push(seatDetail);
      totalAmount += parseFloat(fare.totalPrice.toString());
    }

    return {
      flight: {
        id: flight.id,
        flightNumber: flight.flightNumber,
        origin: flight.origin,
        destination: flight.destination,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime
      },
      seatDetails,
      summary: {
        totalSeats: seatDetails.length,
        totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
        currency: seatDetails[0]?.fare.currency || 'USD',
        breakdown: {
          totalBasePrice: Math.round(seatDetails.reduce((sum, seat) => sum + seat.fare.basePrice, 0) * 100) / 100,
          totalTax: Math.round(seatDetails.reduce((sum, seat) => sum + seat.fare.tax, 0) * 100) / 100,
          totalServiceFee: Math.round(seatDetails.reduce((sum, seat) => sum + seat.fare.serviceFee, 0) * 100) / 100
        }
      }
    };
  }


} 