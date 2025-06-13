import { Injectable, NotFoundException, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking, BookingStatus, User, Flight, Seat, SeatStatus, Fare } from '../entities';
import { CreateBookingDto } from './dto/create-booking.dto';
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

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    // Validate userId is present
    if (!createBookingDto.userId) {
      throw new BadRequestException('User ID is required for booking');
    }

    // First verify that the seat is blocked by the current user
    const seat = await this.seatsRepository.findOne({
      where: { id: createBookingDto.seatId },
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
          .where('seat.id = :seatId', { seatId: createBookingDto.seatId })
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
          seatId: createBookingDto.seatId,
          passengerName: createBookingDto.passengerName,
          passengerEmail: createBookingDto.passengerEmail,
          passengerPhone: createBookingDto.passengerPhone,
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
        await this.seatBlockService.unblockSeat(createBookingDto.seatId, createBookingDto.userId);
      }
      throw error;
    }
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