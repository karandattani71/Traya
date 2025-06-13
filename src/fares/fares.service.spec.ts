import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { FaresService } from './fares.service';
import { Fare, Flight, SeatClass } from '../entities';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('FaresService', () => {
  let service: FaresService;
  let fareRepo: Repository<Fare>;
  let flightRepo: Repository<Flight>;
  let seatClassRepo: Repository<SeatClass>;

  const mockFareRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockFlightRepo = {
    findOne: jest.fn(),
  };

  const mockSeatClassRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaresService,
        {
          provide: getRepositoryToken(Fare),
          useValue: mockFareRepo,
        },
        {
          provide: getRepositoryToken(Flight),
          useValue: mockFlightRepo,
        },
        {
          provide: getRepositoryToken(SeatClass),
          useValue: mockSeatClassRepo,
        },
      ],
    }).compile();

    service = module.get<FaresService>(FaresService);
    fareRepo = module.get<Repository<Fare>>(getRepositoryToken(Fare));
    flightRepo = module.get<Repository<Flight>>(getRepositoryToken(Flight));
    seatClassRepo = module.get<Repository<SeatClass>>(getRepositoryToken(SeatClass));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const mockCreateFareDto = {
      flightId: 'flight-123',
      seatClassId: 'class-123',
      basePrice: 100.00,
      tax: 10.00,
      serviceFee: 5.00,
      currency: 'USD',
      validFrom: now.toISOString(),
      validTo: futureDate.toISOString(),
    };

    it('should successfully create a fare', async () => {
      const mockFlight = { id: 'flight-123' };
      const mockSeatClass = { id: 'class-123' };
      const mockFare = {
        id: 'fare-123',
        ...mockCreateFareDto,
        totalPrice: 115.00, // basePrice + tax + serviceFee
      };

      mockFlightRepo.findOne.mockResolvedValue(mockFlight);
      mockSeatClassRepo.findOne.mockResolvedValue(mockSeatClass);
      mockFareRepo.create.mockReturnValue(mockFare);
      mockFareRepo.save.mockResolvedValue(mockFare);

      const result = await service.create(mockCreateFareDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('fare-123');
      expect(result.totalPrice).toBe(115.00);
    });

    it('should throw NotFoundException when flight not found', async () => {
      mockFlightRepo.findOne.mockResolvedValue(null);

      await expect(service.create(mockCreateFareDto))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw NotFoundException when seat class not found', async () => {
      mockFlightRepo.findOne.mockResolvedValue({ id: 'flight-123' });
      mockSeatClassRepo.findOne.mockResolvedValue(null);

      await expect(service.create(mockCreateFareDto))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw ConflictException when fare already exists for flight and seat class', async () => {
      mockFlightRepo.findOne.mockResolvedValue({ id: 'flight-123' });
      mockSeatClassRepo.findOne.mockResolvedValue({ id: 'class-123' });
      mockFareRepo.create.mockReturnValue(mockCreateFareDto);
      mockFareRepo.save.mockRejectedValue({ code: '23505' }); // Unique constraint violation

      await expect(service.create(mockCreateFareDto))
        .rejects
        .toThrow(ConflictException);
    });
  });

  describe('findByFlightAndSeatClass', () => {
    it('should return a fare when found', async () => {
      const mockFare = {
        id: 'fare-123',
        basePrice: 100.00,
        totalPrice: 115.00,
        flight: { id: 'flight-123' },
        seatClass: { id: 'class-123' },
      };

      mockFareRepo.findOne.mockResolvedValue(mockFare);

      const result = await service.findByFlightAndSeatClass('flight-123', 'class-123');

      expect(result).toEqual(mockFare);
      expect(mockFareRepo.findOne).toHaveBeenCalledWith({
        where: {
          flightId: 'flight-123',
          seatClassId: 'class-123',
          isActive: true,
        },
        relations: ['flight', 'seatClass'],
      });
    });

    it('should throw NotFoundException when fare not found', async () => {
      mockFareRepo.findOne.mockResolvedValue(null);

      await expect(service.findByFlightAndSeatClass('flight-123', 'class-123'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('findByFlight', () => {
    it('should return all fares for a flight', async () => {
      const mockFares = [
        {
          id: 'fare-1',
          basePrice: 100.00,
          seatClass: { name: 'economy' },
        },
        {
          id: 'fare-2',
          basePrice: 200.00,
          seatClass: { name: 'business' },
        },
      ];

      mockFareRepo.find.mockResolvedValue(mockFares);

      const result = await service.findByFlight('flight-123');

      expect(result).toEqual(mockFares);
      expect(mockFareRepo.find).toHaveBeenCalledWith({
        where: {
          flightId: 'flight-123',
          isActive: true,
        },
        relations: ['seatClass'],
        order: {
          seatClass: {
            priority: 'ASC',
          },
        },
      });
    });

    it('should return empty array when no fares found', async () => {
      mockFareRepo.find.mockResolvedValue([]);

      const result = await service.findByFlight('flight-123');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    const mockUpdateFareDto = {
      basePrice: 150.00,
      tax: 15.00,
      serviceFee: 7.50,
    };

    it('should successfully update a fare', async () => {
      const mockFare = {
        id: 'fare-123',
        basePrice: 100.00,
        tax: 10.00,
        serviceFee: 5.00,
        totalPrice: 115.00,
      };

      const updatedFare = {
        ...mockFare,
        ...mockUpdateFareDto,
        totalPrice: 172.50, // new basePrice + tax + serviceFee
      };

      mockFareRepo.findOne.mockResolvedValue(mockFare);
      mockFareRepo.save.mockResolvedValue(updatedFare);

      const result = await service.update('fare-123', mockUpdateFareDto);

      expect(result).toEqual(updatedFare);
      expect(result.totalPrice).toBe(172.50);
    });

    it('should throw NotFoundException when fare not found', async () => {
      mockFareRepo.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', mockUpdateFareDto))
        .rejects
        .toThrow(NotFoundException);
    });
  });
}); 