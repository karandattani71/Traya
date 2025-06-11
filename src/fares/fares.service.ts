import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fare, Flight, SeatClass } from '../entities';
import { CreateFareDto } from './dto/create-fare.dto';

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
    // Verify flight exists
    const flight = await this.flightsRepository.findOne({
      where: { id: createFareDto.flightId },
    });
    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    // Verify seat class exists
    const seatClass = await this.seatClassesRepository.findOne({
      where: { id: createFareDto.seatClassId },
    });
    if (!seatClass) {
      throw new NotFoundException('Seat class not found');
    }

    // Calculate total price
    const totalPrice = createFareDto.basePrice + (createFareDto.tax || 0) + (createFareDto.serviceFee || 0);

    try {
      const fare = this.faresRepository.create({
        ...createFareDto,
        totalPrice,
        validFrom: createFareDto.validFrom ? new Date(createFareDto.validFrom) : null,
        validTo: createFareDto.validTo ? new Date(createFareDto.validTo) : null,
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
    // Verify flight exists
    const flight = await this.flightsRepository.findOne({
      where: { id: flightId },
    });
    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    return this.faresRepository.find({
      where: { flightId, isActive: true },
      relations: ['seatClass'],
      order: {
        seatClass: {
          priority: 'ASC'
        }
      },
    });
  }

  async findByFlightAndSeatClass(flightId: string, seatClassId: string): Promise<Fare | null> {
    return this.faresRepository.findOne({
      where: { flightId, seatClassId, isActive: true },
      relations: ['flight', 'seatClass'],
    });
  }

  async update(id: string, updateFareDto: Partial<CreateFareDto>): Promise<Fare> {
    const fare = await this.findOne(id);

    // Recalculate total price if any pricing component changes
    const basePrice = updateFareDto.basePrice ?? fare.basePrice;
    const tax = updateFareDto.tax ?? fare.tax;
    const serviceFee = updateFareDto.serviceFee ?? fare.serviceFee;
    const totalPrice = basePrice + tax + serviceFee;

    Object.assign(fare, {
      ...updateFareDto,
      totalPrice,
      validFrom: updateFareDto.validFrom ? new Date(updateFareDto.validFrom) : fare.validFrom,
      validTo: updateFareDto.validTo ? new Date(updateFareDto.validTo) : fare.validTo,
    });

    try {
      return await this.faresRepository.save(fare);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictException('Fare already exists for this flight and seat class');
      }
      throw error;
    }
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