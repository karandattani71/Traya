import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Flight, Seat, SeatClass, SeatStatus, FlightStatus, SeatClassName, Fare } from '../entities';
import { CreateFlightDto } from './dto/create-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { UpdateFlightStatusDto } from './dto/update-flight-status.dto';
import { FlightDetailsDto } from './dto/flight-details.dto';

@Injectable()
export class FlightsService {
  constructor(
    @InjectRepository(Flight)
    private flightsRepository: Repository<Flight>,
    @InjectRepository(Seat)
    private seatsRepository: Repository<Seat>,
    @InjectRepository(SeatClass)
    private seatClassesRepository: Repository<SeatClass>,
    @InjectRepository(Fare)
    private faresRepository: Repository<Fare>,
  ) {}

  async create(createFlightDto: CreateFlightDto): Promise<Flight> {
    // Validate arrival time is after departure time
    const departureTime = new Date(createFlightDto.departureTime);
    const arrivalTime = new Date(createFlightDto.arrivalTime);

    if (arrivalTime <= departureTime) {
      throw new BadRequestException('Arrival time must be after departure time');
    }

    try {
      // Check if flight number already exists
      const existingFlight = await this.flightsRepository.findOne({
        where: { flightNumber: createFlightDto.flightNumber }
      });

      if (existingFlight) {
        throw new ConflictException('Flight number already exists');
      }

      // Create flight only (no seats, no fares)
      const flight = this.flightsRepository.create({
        flightNumber: createFlightDto.flightNumber,
        origin: createFlightDto.origin,
        destination: createFlightDto.destination,
        originCode: createFlightDto.originCode,
        destinationCode: createFlightDto.destinationCode,
        departureTime: createFlightDto.departureTime,
        arrivalTime: createFlightDto.arrivalTime,
        aircraft: createFlightDto.aircraft,
        status: FlightStatus.ON_TIME,
        totalSeats: 0, // Will be updated when seats are added
        availableSeats: 0, // Will be updated when seats are added
      });

      const savedFlight = await this.flightsRepository.save(flight);
      console.log(`Flight ${savedFlight.flightNumber} created successfully`);

      return savedFlight;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to create flight: ' + error.message);
    }
  }

  async addSeatsForClass(flightId: string, seatClassName: SeatClassName, seatCount: number): Promise<{ message: string; seatsCreated: number }> {
    // Validate flight exists
    const flight = await this.flightsRepository.findOne({
      where: { id: flightId },
      relations: ['seats']
    });

    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    // Validate seat class exists
    const seatClass = await this.seatClassesRepository.findOne({
      where: { name: seatClassName }
    });

    if (!seatClass) {
      throw new NotFoundException(`Seat class ${seatClassName} not found`);
    }

    // Check if seats already exist for this class
    const existingSeats = flight.seats.filter(seat => seat.seatClassId === seatClass.id);
    if (existingSeats.length > 0) {
      throw new ConflictException(`Seats for ${seatClassName} class already exist on this flight`);
    }

         // Generate seats for the specified class
     const seatsToCreate = await this.generateSeatsForClass(flight, seatClass, seatCount);
    
    // Save seats
    await this.seatsRepository.save(seatsToCreate);

    // Update flight's total and available seats
    await this.updateFlightSeatCounts(flightId);

    console.log(`Created ${seatsToCreate.length} ${seatClassName} seats for flight ${flight.flightNumber}`);

    return {
      message: `Successfully added ${seatsToCreate.length} ${seatClassName} seats to flight ${flight.flightNumber}`,
      seatsCreated: seatsToCreate.length
    };
  }

     private async generateSeatsForClass(flight: Flight, seatClass: SeatClass, targetSeatCount: number): Promise<Partial<Seat>[]> {
    const seats: Partial<Seat>[] = [];

    // Configuration based on seat class
    const config = this.getSeatClassConfiguration(seatClass.name);
    
    // Calculate rows needed
    const rows = Math.ceil(targetSeatCount / config.columns.length);
    
         // Get the starting row (after existing seats)
     const startingRow = await this.getNextAvailableRow(flight);

     // Generate seats
     for (let row = 0; row < rows && seats.length < targetSeatCount; row++) {
       for (const column of config.columns) {
         if (seats.length < targetSeatCount) {
           seats.push({
             seatNumber: `${startingRow + row}${column}`,
             status: SeatStatus.AVAILABLE,
             row: startingRow + row,
            column: column,
            flight,
            seatClass,
            flightId: flight.id,
            seatClassId: seatClass.id,
          });
        }
      }
    }

    return seats;
  }

  private getSeatClassConfiguration(seatClassName: SeatClassName) {
    const configurations = {
      [SeatClassName.FIRST]: {
        columns: ['A', 'B', 'E', 'F'], // 2-2 configuration
        seatsPerRow: 4
      },
      [SeatClassName.BUSINESS]: {
        columns: ['A', 'B', 'C', 'D', 'E', 'F'], // 3-3 configuration
        seatsPerRow: 6
      },
      [SeatClassName.ECONOMY]: {
        columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], // 4-4 configuration
        seatsPerRow: 8
      }
    };

    return configurations[seatClassName];
  }

  private async getNextAvailableRow(flight: Flight): Promise<number> {
    const existingSeats = await this.seatsRepository.find({
      where: { flightId: flight.id },
      order: { row: 'DESC' },
      take: 1
    });

    if (existingSeats.length === 0) {
      return 1; // Start from row 1
    }

    // Add 5 rows spacing between classes
    return existingSeats[0].row + 6;
  }

  private async updateFlightSeatCounts(flightId: string): Promise<void> {
    const seats = await this.seatsRepository.find({
      where: { flightId }
    });

    const totalSeats = seats.length;
    const availableSeats = seats.filter(seat => seat.status === SeatStatus.AVAILABLE).length;

    await this.flightsRepository.update(flightId, {
      totalSeats,
      availableSeats
    });
  }

  async removeSeatsForClass(flightId: string, seatClassName: SeatClassName): Promise<{ message: string; seatsRemoved: number }> {
    // Validate flight exists
    const flight = await this.flightsRepository.findOne({
      where: { id: flightId }
    });

    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    // Validate seat class exists
    const seatClass = await this.seatClassesRepository.findOne({
      where: { name: seatClassName }
    });

    if (!seatClass) {
      throw new NotFoundException(`Seat class ${seatClassName} not found`);
    }

    // Find seats for this class
    const seatsToRemove = await this.seatsRepository.find({
      where: { 
        flightId: flightId,
        seatClassId: seatClass.id
      }
    });

    if (seatsToRemove.length === 0) {
      throw new NotFoundException(`No ${seatClassName} seats found for this flight`);
    }

    // Check if any seats are booked
    const bookedSeats = seatsToRemove.filter(seat => seat.status === SeatStatus.BOOKED);
    if (bookedSeats.length > 0) {
      throw new ConflictException(`Cannot remove ${seatClassName} seats: ${bookedSeats.length} seats are already booked`);
    }

    // Remove seats
    await this.seatsRepository.remove(seatsToRemove);

    // Update flight seat counts
    await this.updateFlightSeatCounts(flightId);

    console.log(`Removed ${seatsToRemove.length} ${seatClassName} seats from flight ${flight.flightNumber}`);

    return {
      message: `Successfully removed ${seatsToRemove.length} ${seatClassName} seats from flight ${flight.flightNumber}`,
      seatsRemoved: seatsToRemove.length
    };
  }

  async getFlightSeatConfiguration(flightId: string) {
    const flight = await this.flightsRepository.findOne({
      where: { id: flightId },
      relations: ['seats', 'seats.seatClass']
    });

    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    // Group seats by class
    const seatsByClass = flight.seats.reduce((acc, seat) => {
      const className = seat.seatClass.name;
      if (!acc[className]) {
        acc[className] = {
          seatClass: seat.seatClass,
          totalSeats: 0,
          availableSeats: 0,
          bookedSeats: 0,
          blockedSeats: 0
        };
      }
      
      acc[className].totalSeats++;
      
      switch (seat.status) {
        case SeatStatus.AVAILABLE:
          acc[className].availableSeats++;
          break;
        case SeatStatus.BOOKED:
          acc[className].bookedSeats++;
          break;
        case SeatStatus.BLOCKED:
          acc[className].blockedSeats++;
          break;
      }
      
      return acc;
    }, {});

    return {
      flight: {
        id: flight.id,
        flightNumber: flight.flightNumber,
        origin: flight.origin,
        destination: flight.destination,
        totalSeats: flight.totalSeats,
        availableSeats: flight.availableSeats
      },
      seatConfiguration: seatsByClass
    };
  }

  async findAll(): Promise<Flight[]> {
    return this.flightsRepository.find({
      relations: ['seats', 'fares', 'fares.seatClass'],
      order: { departureTime: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Flight> {
    const flight = await this.flightsRepository.findOne({
      where: { id },
      relations: ['seats', 'seats.seatClass', 'fares', 'fares.seatClass', 'bookings'],
    });

    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    return flight;
  }

  async search(searchDto: SearchFlightsDto): Promise<Flight[]> {
    const { originCode, destinationCode, departureDate } = searchDto;

    // Create date range for the departure date
    const startDate = new Date(departureDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(departureDate);
    endDate.setHours(23, 59, 59, 999);

    const queryBuilder = this.flightsRepository.createQueryBuilder('flight')
      .leftJoinAndSelect('flight.seats', 'seat')
      .leftJoinAndSelect('flight.fares', 'fare')
      .where('flight.originCode = :originCode', { originCode })
      .andWhere('flight.destinationCode = :destinationCode', { destinationCode })
      .andWhere('flight.departureTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('flight.status != :cancelledStatus', {
        cancelledStatus: FlightStatus.CANCELLED,
      })
      .orderBy('flight.departureTime', 'ASC');

    return queryBuilder.getMany();
  }

  async updateStatus(id: string, updateStatusDto: UpdateFlightStatusDto): Promise<Flight> {
    const flight = await this.flightsRepository.findOne({
      where: { id },
      relations: ['seats', 'fares'], // Only load essential relations
    });
    
    if (!flight) {
      throw new NotFoundException('Flight not found');
    }
    
    flight.status = updateStatusDto.status;
    
    return this.flightsRepository.save(flight);
  }

  async update(id: string, updateFlightDto: UpdateFlightDto): Promise<Flight> {
    const flight = await this.findOne(id);

    Object.assign(flight, {
      ...updateFlightDto,
      departureTime: updateFlightDto.departureTime ? new Date(updateFlightDto.departureTime) : flight.departureTime,
      arrivalTime: updateFlightDto.arrivalTime ? new Date(updateFlightDto.arrivalTime) : flight.arrivalTime,
    });

    try {
      return await this.flightsRepository.save(flight);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictException('Flight number already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const flight = await this.findOne(id);
    await this.flightsRepository.remove(flight);
  }

  async getAvailableSeats(flightId: string, seatClassName?: SeatClassName): Promise<Seat[]> {
    const queryBuilder = this.seatsRepository.createQueryBuilder('seat')
      .leftJoinAndSelect('seat.seatClass', 'seatClass')
      .where('seat.flightId = :flightId', { flightId })
      .andWhere('seat.status = :status', { status: SeatStatus.AVAILABLE });

    if (seatClassName) {
      queryBuilder.andWhere('seatClass.name = :seatClassName', { seatClassName });
    }

    return queryBuilder
      .orderBy('seat.row', 'ASC')
      .addOrderBy('seat.column', 'ASC')
      .getMany();
  }

  async getFlightDetails(id: string): Promise<FlightDetailsDto> {
    const flight = await this.flightsRepository.findOne({
      where: { id },
      relations: [
        'seats',
        'seats.seatClass',
        'fares',
        'fares.seatClass'
      ],
    });

    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    // Group seats by class and count available seats
    const seatsByClass = flight.seats.reduce((acc, seat) => {
      const className = seat.seatClass.name;
      if (!acc[className]) {
        acc[className] = {
          total: 0,
          available: 0,
          seatClass: seat.seatClass
        };
      }
      acc[className].total++;
      if (seat.status === SeatStatus.AVAILABLE) {
        acc[className].available++;
      }
      return acc;
    }, {});

    // Add fare information to each seat class (only active fares)
    Object.values(seatsByClass).forEach((classInfo: any) => {
      const fare = flight.fares.find(f => f.seatClass.id === classInfo.seatClass.id && f.isActive);
      if (fare) {
        classInfo.fare = {
          basePrice: fare.basePrice,
          tax: fare.tax,
          serviceFee: fare.serviceFee,
          totalPrice: fare.totalPrice,
          currency: fare.currency
        };
      }
    });

    return {
      ...flight,
      seatAvailability: seatsByClass
    } as FlightDetailsDto;
  }

  async getSeatClassesWithFares(id: string) {
    const flight = await this.flightsRepository.findOne({
      where: { id },
      relations: [
        'seats',
        'seats.seatClass',
        'fares',
        'fares.seatClass'
      ],
    });

    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    // Group by seat class and include fare information (only active fares)
    const seatClasses = flight.fares
      .filter(fare => fare.isActive)
      .map(fare => ({
        id: fare.seatClass.id,
        name: fare.seatClass.name,
        description: fare.seatClass.description,
        fare: {
          basePrice: fare.basePrice,
          tax: fare.tax,
          serviceFee: fare.serviceFee,
          totalPrice: fare.totalPrice,
          currency: fare.currency
        },
        availableSeats: flight.seats.filter(
          seat => seat.seatClass.id === fare.seatClass.id && 
          seat.status === SeatStatus.AVAILABLE
        ).length
      }));

    return seatClasses;
  }

  async getAvailableSeatsWithFares(id: string, seatClassName: SeatClassName) {
    const flight = await this.flightsRepository.findOne({
      where: { id },
      relations: [
        'seats',
        'seats.seatClass',
        'fares',
        'fares.seatClass'
      ],
    });

    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    // Get active fare for the seat class
    const fare = flight.fares.find(f => f.seatClass.name === seatClassName && f.isActive);
    if (!fare) {
      throw new NotFoundException(`No active fare found for seat class ${seatClassName}`);
    }

    // Get available seats for the class
    const seats = flight.seats
      .filter(seat => 
        seat.seatClass.name === seatClassName && 
        seat.status === SeatStatus.AVAILABLE
      )
      .map(seat => ({
        id: seat.id,
        seatNumber: seat.seatNumber,
        row: seat.row,
        column: seat.column,
        seatClass: {
          name: seat.seatClass.name,
          description: seat.seatClass.description
        },
        fare: {
          basePrice: fare.basePrice,
          tax: fare.tax,
          serviceFee: fare.serviceFee,
          totalPrice: fare.totalPrice,
          currency: fare.currency
        }
      }));

    return {
      seatClass: {
        name: seatClassName,
        description: fare.seatClass.description,
        fare: {
          basePrice: fare.basePrice,
          tax: fare.tax,
          serviceFee: fare.serviceFee,
          totalPrice: fare.totalPrice,
          currency: fare.currency
        }
      },
      availableSeats: seats
    };
  }
} 