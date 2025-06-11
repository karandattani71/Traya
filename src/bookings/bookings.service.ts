import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking, BookingStatus, User, Flight, Seat, SeatStatus, Fare } from '../entities';
import { CreateBookingDto } from './dto/create-booking.dto';
import { v4 as uuidv4 } from 'uuid';

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
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    // Use database transaction to handle concurrency
    return this.dataSource.transaction(async (manager) => {
      // Verify user exists
      const user = await manager.findOne(User, { where: { id: createBookingDto.userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify flight exists and is not cancelled
      const flight = await manager.findOne(Flight, { 
        where: { id: createBookingDto.flightId },
        relations: ['seats'],
      });
      if (!flight) {
        throw new NotFoundException('Flight not found');
      }
      if (flight.status === 'cancelled') {
        throw new BadRequestException('Cannot book a cancelled flight');
      }

      // Lock and verify seat availability (critical section for concurrency)
      const seat = await manager.findOne(Seat, {
        where: { id: createBookingDto.seatId, flightId: createBookingDto.flightId },
        relations: ['seatClass'],
        lock: { mode: 'pessimistic_write' }, // Prevent concurrent access
      });

      if (!seat) {
        throw new NotFoundException('Seat not found');
      }

      if (seat.status !== SeatStatus.AVAILABLE) {
        throw new ConflictException('Seat is no longer available');
      }

      // Get fare for the seat class
      const fare = await manager.findOne(Fare, {
        where: { 
          flightId: createBookingDto.flightId,
          seatClassId: seat.seatClassId,
          isActive: true,
        },
      });

      if (!fare) {
        throw new NotFoundException('No active fare found for this seat class');
      }

      // Create booking reference
      const bookingReference = this.generateBookingReference();

      // Create the booking
      const booking = manager.create(Booking, {
        bookingReference,
        userId: createBookingDto.userId,
        flightId: createBookingDto.flightId,
        seatId: createBookingDto.seatId,
        passengerName: createBookingDto.passengerName,
        passengerEmail: createBookingDto.passengerEmail,
        passengerPhone: createBookingDto.passengerPhone,
        totalAmount: fare.totalPrice,
        status: BookingStatus.CONFIRMED,
        bookingDate: new Date(),
        paymentDate: new Date(), // In real implementation, this would be set after payment
      });

      const savedBooking = await manager.save(Booking, booking);

      // Update seat status
      await manager.update(Seat, seat.id, { status: SeatStatus.BOOKED });

      // Update flight available seats
      await manager.decrement(Flight, { id: flight.id }, 'availableSeats', 1);

      // Return booking with relations
      return manager.findOne(Booking, {
        where: { id: savedBooking.id },
        relations: ['user', 'flight', 'seat', 'seat.seatClass'],
      });
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
      // Lock the booking to prevent concurrent cancellations
      const booking = await manager.findOne(Booking, {
        where: { id },
        relations: ['flight', 'seat'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw new BadRequestException('Booking is already cancelled');
      }

      // Check if flight has already departed (optional business rule)
      const now = new Date();
      if (booking.flight.departureTime < now) {
        throw new BadRequestException('Cannot cancel booking for departed flights');
      }

      // Update booking status
      await manager.update(Booking, id, { status: BookingStatus.CANCELLED });

      // Release the seat
      await manager.update(Seat, booking.seatId, { status: SeatStatus.AVAILABLE });

      // Update flight available seats
      await manager.increment(Flight, { id: booking.flightId }, 'availableSeats', 1);

      // Return updated booking
      return manager.findOne(Booking, {
        where: { id },
        relations: ['user', 'flight', 'seat', 'seat.seatClass'],
      });
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

  async getBookingStats(): Promise<any> {
    const [confirmed, cancelled, pending, total] = await Promise.all([
      this.bookingsRepository.count({ where: { status: BookingStatus.CONFIRMED } }),
      this.bookingsRepository.count({ where: { status: BookingStatus.CANCELLED } }),
      this.bookingsRepository.count({ where: { status: BookingStatus.PENDING } }),
      this.bookingsRepository.count(),
    ]);

    return {
      confirmed,
      cancelled,
      pending,
      total,
    };
  }
} 