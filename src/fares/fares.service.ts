import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fare, Flight, SeatClass } from '../entities';
import { CreateFareDto } from './dto/create-fare.dto';
import { UpdateFareDto } from './dto/update-fare.dto';

@Injectable()
export class FaresService {
  constructor(
    @InjectRepository(Fare)
    private faresRepository: Repository<Fare>,
    @InjectRepository(Flight)
    private flightsRepository: Repository<Flight>,
    @InjectRepository(SeatClass)
    private seatClassesRepository: Repository<SeatClass>,
  ) {}

  async create(createFareDto: CreateFareDto): Promise<Fare> {
    // Check if flight exists
    const flight = await this.flightsRepository.findOne({
      where: { id: createFareDto.flightId },
    });

    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    // Check if seat class exists
    const seatClass = await this.seatClassesRepository.findOne({
      where: { id: createFareDto.seatClassId },
    });

    if (!seatClass) {
      throw new NotFoundException('Seat class not found');
    }

    try {
      // Calculate total price
      const totalPrice = createFareDto.basePrice + createFareDto.tax + createFareDto.serviceFee;

      // Create fare
      const fare = this.faresRepository.create({
        ...createFareDto,
        totalPrice,
        isActive: true,
      });

      return await this.faresRepository.save(fare);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictException('Fare already exists for this flight and seat class');
      }
      throw error;
    }
  }

  async findAll(): Promise<Fare[]> {
    return this.faresRepository.find({
      relations: ['flight', 'seatClass'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Fare> {
    const fare = await this.faresRepository.findOne({
      where: { id },
      relations: ['flight', 'seatClass'],
    });

    if (!fare) {
      throw new NotFoundException('Fare not found');
    }

    return fare;
  }

  async findByFlight(flightId: string): Promise<Fare[]> {
    return this.faresRepository.find({
      where: {
        flightId,
        isActive: true,
      },
      relations: ['seatClass'],
      order: {
        seatClass: {
          priority: 'ASC',
        },
      },
    });
  }

  async findByFlightAndSeatClass(flightId: string, seatClassId: string): Promise<Fare> {
    const fare = await this.faresRepository.findOne({
      where: {
        flightId,
        seatClassId,
        isActive: true,
      },
      relations: ['flight', 'seatClass'],
    });

    if (!fare) {
      throw new NotFoundException('Fare not found');
    }

    return fare;
  }

  async update(id: string, updateFareDto: UpdateFareDto): Promise<Fare> {
    const fare = await this.faresRepository.findOne({
      where: { id },
    });

    if (!fare) {
      throw new NotFoundException('Fare not found');
    }

    // Update total price if any price component is updated
    const totalPrice = 
      (updateFareDto.basePrice || fare.basePrice) +
      (updateFareDto.tax || fare.tax) +
      (updateFareDto.serviceFee || fare.serviceFee);

    const updatedFare = {
      ...fare,
      ...updateFareDto,
      totalPrice,
    };

    return this.faresRepository.save(updatedFare);
  }

  async remove(id: string): Promise<void> {
    const fare = await this.findOne(id);
    await this.faresRepository.remove(fare);
  }

  async deactivate(id: string): Promise<Fare> {
    const fare = await this.findOne(id);
    fare.isActive = false;
    return this.faresRepository.save(fare);
  }

  async activate(id: string): Promise<Fare> {
    const fare = await this.findOne(id);
    fare.isActive = true;
    return this.faresRepository.save(fare);
  }

  async getActiveFares(): Promise<Fare[]> {
    const now = new Date();
    
    return this.faresRepository
      .createQueryBuilder('fare')
      .leftJoinAndSelect('fare.flight', 'flight')
      .leftJoinAndSelect('fare.seatClass', 'seatClass')
      .where('fare.isActive = :isActive', { isActive: true })
      .andWhere(
        '(fare.validFrom IS NULL OR fare.validFrom <= :now) AND (fare.validTo IS NULL OR fare.validTo >= :now)',
        { now },
      )
      .orderBy('flight.departureTime', 'ASC')
      .addOrderBy('seatClass.priority', 'ASC')
      .getMany();
  }
} 