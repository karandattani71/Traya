import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Flight, Seat, SeatClass, SeatStatus, FlightStatus, SeatClassName } from '../entities';
import { CreateFlightDto } from './dto/create-flight.dto';
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

      // Create flight
      const flight = this.flightsRepository.create({
        ...createFlightDto,
        status: FlightStatus.ON_TIME,
        totalSeats: createFlightDto.totalSeats || 0,
        availableSeats: createFlightDto.totalSeats || 0,
      });

      const savedFlight = await this.flightsRepository.save(flight);

      // Get seat classes
      const seatClasses = await this.seatClassesRepository.find({
        order: { priority: 'DESC' } // First class (highest priority) first
      });

      // Create seats for each class
      const seatsToCreate = this.generateSeats(savedFlight, seatClasses);
      
      // Log the number of seats created
      const seatsByClass = seatsToCreate.reduce((acc, seat) => {
        const className = seat.seatClass.name;
        acc[className] = (acc[className] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Seats generated:', {
        byClass: seatsByClass,
        total: seatsToCreate.length
      });

      await this.seatsRepository.save(seatsToCreate);

      return savedFlight;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error('Failed to create flight: ' + error.message);
    }
  }

  private generateSeats(flight: Flight, seatClasses: SeatClass[]): Partial<Seat>[] {
    const seats: Partial<Seat>[] = [];
    const totalSeats = flight.totalSeats || 300; // Default to 300 if not specified

    // Distribution of seats by class
    const distribution = {
      first: 0.1,    // 10% First Class
      business: 0.2, // 20% Business Class
      economy: 0.7,  // 70% Economy Class
    };

    let currentRow = 1; // Start from row 1
    let remainingSeats = totalSeats;

    // Generate seats for each class
    seatClasses.forEach((seatClass, index) => {
      const seatsPerRow = seatClass.name === 'first' ? 4 : // 2-2 configuration for first class
                         seatClass.name === 'business' ? 6 : // 3-3 configuration for business class
                         8; // 4-4 configuration for economy class

      const columns = seatClass.name === 'first' ? ['A', 'B', 'E', 'F'] : // Skip C, D for first class
                     seatClass.name === 'business' ? ['A', 'B', 'C', 'D', 'E', 'F'] : // All columns for business
                     ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']; // All columns for economy

      // Calculate target seats for this class
      let targetSeatCount;
      if (index === seatClasses.length - 1) {
        // For the last class (economy), use remaining seats
        targetSeatCount = remainingSeats;
      } else {
        // For first and business class, calculate based on distribution
        targetSeatCount = Math.ceil(totalSeats * distribution[seatClass.name]);
      }

      // Calculate rows needed (round up to ensure we have enough rows)
      const rows = Math.ceil(targetSeatCount / columns.length);
      const actualSeatsForClass = rows * columns.length;

      // Generate seats for this class
      for (let row = 0; row < rows; row++) {
        for (const column of columns) {
          // Only create the seat if we haven't exceeded the total seats
          if (seats.length < totalSeats) {
            seats.push({
              seatNumber: `${currentRow + row}${column}`,
              status: SeatStatus.AVAILABLE,
              row: currentRow + row,
              column: column,
              flight,
              seatClass,
              flightId: flight.id,
              seatClassId: seatClass.id,
            });
          }
        }
      }

      // Update remaining seats and current row
      remainingSeats -= actualSeatsForClass;
      currentRow += rows;

      // Add spacing between classes (5 rows between classes)
      if (index < seatClasses.length - 1) {
        currentRow += 5;
      }
    });

    return seats;
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

  async update(id: string, updateFlightDto: Partial<CreateFlightDto>): Promise<Flight> {
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

    // Add fare information to each seat class
    Object.values(seatsByClass).forEach((classInfo: any) => {
      const fare = flight.fares.find(f => f.seatClass.id === classInfo.seatClass.id);
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

    // Group by seat class and include fare information
    const seatClasses = flight.fares.map(fare => ({
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

    // Get fare for the seat class
    const fare = flight.fares.find(f => f.seatClass.name === seatClassName);
    if (!fare) {
      throw new NotFoundException(`No fare found for seat class ${seatClassName}`);
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