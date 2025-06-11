import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Flight, Seat, SeatClass, SeatStatus, FlightStatus, SeatClassName } from '../entities';
import { CreateFlightDto } from './dto/create-flight.dto';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { UpdateFlightStatusDto } from './dto/update-flight-status.dto';

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
    try {
      const flight = this.flightsRepository.create({
        ...createFlightDto,
        departureTime: new Date(createFlightDto.departureTime),
        arrivalTime: new Date(createFlightDto.arrivalTime),
        totalSeats: createFlightDto.totalSeats || 0,
        availableSeats: createFlightDto.totalSeats || 0,
      });

      const savedFlight = await this.flightsRepository.save(flight);

      // Create seats for the flight if totalSeats is provided
      if (createFlightDto.totalSeats) {
        await this.createSeatsForFlight(savedFlight, createFlightDto.totalSeats);
      }

      return savedFlight;
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictException('Flight number already exists');
      }
      throw error;
    }
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
    const { origin, destination, departureDate, seatClass, passengers = 1 } = searchDto;

    const startDate = new Date(departureDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(departureDate);
    endDate.setHours(23, 59, 59, 999);

    const queryBuilder = this.flightsRepository.createQueryBuilder('flight')
      .leftJoinAndSelect('flight.seats', 'seat')
      .leftJoinAndSelect('seat.seatClass', 'seatClass')
      .leftJoinAndSelect('flight.fares', 'fare')
      .leftJoinAndSelect('fare.seatClass', 'fareSeatClass')
      .where('LOWER(flight.origin) = LOWER(:origin)', { origin })
      .andWhere('LOWER(flight.destination) = LOWER(:destination)', { destination })
      .andWhere('flight.departureTime BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('flight.status != :cancelledStatus', { cancelledStatus: FlightStatus.CANCELLED })
      .andWhere('flight.availableSeats >= :passengers', { passengers });

    if (seatClass) {
      queryBuilder.andWhere('seatClass.name = :seatClass', { seatClass });
    }

    return queryBuilder
      .orderBy('flight.departureTime', 'ASC')
      .getMany();
  }

  async updateStatus(id: string, updateStatusDto: UpdateFlightStatusDto): Promise<Flight> {
    const flight = await this.findOne(id);
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

  private async createSeatsForFlight(flight: Flight, totalSeats: number): Promise<void> {
    const seatClasses = await this.seatClassesRepository.find();
    
    if (seatClasses.length === 0) {
      throw new BadRequestException('No seat classes found. Please create seat classes first.');
    }

    // Distribute seats across classes (example distribution)
    const economySeats = Math.floor(totalSeats * 0.7); // 70% economy
    const businessSeats = Math.floor(totalSeats * 0.2); // 20% business
    const firstSeats = totalSeats - economySeats - businessSeats; // remaining first class

    const seatsToCreate = [];
    let seatNumber = 1;

    // Create seats for each class
    for (const seatClass of seatClasses) {
      let seatsForClass = 0;
      
      switch (seatClass.name) {
        case SeatClassName.ECONOMY:
          seatsForClass = economySeats;
          break;
        case SeatClassName.BUSINESS:
          seatsForClass = businessSeats;
          break;
        case SeatClassName.FIRST:
          seatsForClass = firstSeats;
          break;
      }

      for (let i = 0; i < seatsForClass; i++) {
        const row = Math.ceil(seatNumber / 6);
        const column = String.fromCharCode(65 + ((seatNumber - 1) % 6)); // A, B, C, D, E, F

        seatsToCreate.push({
          seatNumber: `${row}${column}`,
          row,
          column,
          flight,
          flightId: flight.id,
          seatClass,
          seatClassId: seatClass.id,
          status: SeatStatus.AVAILABLE,
        });

        seatNumber++;
      }
    }

    await this.seatsRepository.save(seatsToCreate);
  }
} 