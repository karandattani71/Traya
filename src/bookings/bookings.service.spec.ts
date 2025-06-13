import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BookingsService } from './bookings.service';
import { Booking, BookingStatus, User, Flight, Seat, SeatStatus, Fare, SeatClass } from '../entities';
import { CreateBookingDto } from './dto/create-booking.dto';
import { SeatBlockService } from '../seats/seat-block.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingRepo: Repository<Booking>;
  let userRepo: Repository<User>;
  let flightRepo: Repository<Flight>;
  let seatRepo: Repository<Seat>;
  let fareRepo: Repository<Fare>;
  let dataSource: DataSource;

  const mockDataSource = {
    transaction: jest.fn(),
    createQueryRunner: jest.fn(),
  };

  const mockBookingRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockFlightRepo = {
    findOne: jest.fn(),
    decrement: jest.fn(),
  };

  const mockSeatRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockFareRepo = {
    findOne: jest.fn(),
  };

  const mockSeatBlockService = {
    unblockSeat: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(Flight),
          useValue: mockFlightRepo,
        },
        {
          provide: getRepositoryToken(Seat),
          useValue: mockSeatRepo,
        },
        {
          provide: getRepositoryToken(Fare),
          useValue: mockFareRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: SeatBlockService,
          useValue: mockSeatBlockService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    bookingRepo = module.get<Repository<Booking>>(getRepositoryToken(Booking));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    flightRepo = module.get<Repository<Flight>>(getRepositoryToken(Flight));
    seatRepo = module.get<Repository<Seat>>(getRepositoryToken(Seat));
    fareRepo = module.get<Repository<Fare>>(getRepositoryToken(Fare));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockCreateBookingDto: CreateBookingDto = {
      userId: 'user-123',
      flightId: 'flight-123',
      passengers: [
        {
          seatId: 'seat-123',
          passengerName: 'John Doe',
          passengerEmail: 'john@example.com',
          passengerPhone: '+1234567890',
        }
      ]
    };

    const mockUser = { id: 'user-123', email: 'john@example.com' };
    const mockFlight = { id: 'flight-123', availableSeats: 10 };
    const mockSeat = { 
      id: 'seat-123', 
      status: SeatStatus.BLOCKED,
      blockedByUserId: 'user-123',
      seatClass: { id: 'class-123', name: 'economy' }
    };
    const mockFare = { totalPrice: 100.00 };

    it('should successfully create a booking', async () => {
      const mockSavedBooking = {
        id: 'booking-123',
        ...mockCreateBookingDto,
        status: BookingStatus.CONFIRMED,
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockFlightRepo.findOne.mockResolvedValue(mockFlight);
      mockSeatRepo.findOne.mockResolvedValue(mockSeat);
      mockFareRepo.findOne.mockResolvedValue(mockFare);
      
      mockDataSource.transaction.mockImplementation(async (cb) => {
        return cb({
          create: jest.fn().mockReturnValue(mockSavedBooking),
          save: jest.fn().mockResolvedValue(mockSavedBooking),
          update: jest.fn(),
          decrement: jest.fn(),
          findOne: jest.fn().mockResolvedValue(mockSavedBooking),
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            innerJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(mockSeat),
          }),
        });
      });

      const result = await service.create(mockCreateBookingDto);

      expect(result).toBeDefined();
      // For single passenger, it returns a single booking object
      expect((result as any).id).toBe('booking-123');
      expect((result as any).status).toBe(BookingStatus.CONFIRMED);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockFlightRepo.findOne.mockResolvedValue(mockFlight);
      mockSeatRepo.findOne.mockResolvedValue(mockSeat);
      mockFareRepo.findOne.mockResolvedValue(mockFare);

      await expect(service.create(mockCreateBookingDto))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw NotFoundException when flight not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockFlightRepo.findOne.mockResolvedValue(null);
      mockSeatRepo.findOne.mockResolvedValue(mockSeat);
      mockFareRepo.findOne.mockResolvedValue(mockFare);

      await expect(service.create(mockCreateBookingDto))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw NotFoundException when seat not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockFlightRepo.findOne.mockResolvedValue(mockFlight);
      mockSeatRepo.findOne.mockResolvedValue(null);
      mockFareRepo.findOne.mockResolvedValue(mockFare);

      await expect(service.create(mockCreateBookingDto))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw ConflictException when seat is not available', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockFlightRepo.findOne.mockResolvedValue(mockFlight);
      mockSeatRepo.findOne.mockResolvedValue({ ...mockSeat, status: SeatStatus.BOOKED });
      mockFareRepo.findOne.mockResolvedValue(mockFare);

      await expect(service.create(mockCreateBookingDto))
        .rejects
        .toThrow(ConflictException);
    });

    it('should throw NotFoundException when fare not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockFlightRepo.findOne.mockResolvedValue(mockFlight);
      mockSeatRepo.findOne.mockResolvedValue(mockSeat);
      mockFareRepo.findOne.mockResolvedValue(null);

      await expect(service.create(mockCreateBookingDto))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return an array of bookings', async () => {
      const mockBookings = [
        { id: 'booking-1', passengerName: 'John Doe' },
        { id: 'booking-2', passengerName: 'Jane Smith' },
      ];

      mockBookingRepo.find.mockResolvedValue(mockBookings);

      const result = await service.findAll();

      expect(result).toEqual(mockBookings);
      expect(mockBookingRepo.find).toHaveBeenCalledWith({
        relations: ['user', 'flight', 'seat', 'seat.seatClass'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findByBookingReference', () => {
    it('should return a booking when found', async () => {
      const mockBooking = {
        id: 'booking-123',
        bookingReference: 'REF123',
        passengerName: 'John Doe',
      };

      mockBookingRepo.findOne.mockResolvedValue(mockBooking);

      const result = await service.findByBookingReference('REF123');

      expect(result).toEqual(mockBooking);
      expect(mockBookingRepo.findOne).toHaveBeenCalledWith({
        where: { bookingReference: 'REF123' },
        relations: ['user', 'flight', 'seat', 'seat.seatClass'],
      });
    });

    it('should throw NotFoundException when booking not found', async () => {
      mockBookingRepo.findOne.mockResolvedValue(null);

      await expect(service.findByBookingReference('NONEXISTENT'))
        .rejects
        .toThrow(NotFoundException);
    });
  });
}); 