import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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

    // Calculate total price
    const totalPrice = createFareDto.basePrice + (createFareDto.tax || 0) + (createFareDto.serviceFee || 0);

    // Validate pricing hierarchy before creating
    await this.validatePricingHierarchy(createFareDto.flightId, seatClass.name, totalPrice);

    try {
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
      relations: ['seatClass'],
    });

    if (!fare) {
      throw new NotFoundException('Fare not found');
    }

    // Calculate new total price
    const newTotalPrice = 
      (updateFareDto.basePrice !== undefined ? updateFareDto.basePrice : fare.basePrice) +
      (updateFareDto.tax !== undefined ? updateFareDto.tax : fare.tax) +
      (updateFareDto.serviceFee !== undefined ? updateFareDto.serviceFee : fare.serviceFee);

    // Validate pricing hierarchy before updating
    await this.validatePricingHierarchy(fare.flightId, fare.seatClass.name, newTotalPrice, id);

    const updatedFare = {
      ...fare,
      ...updateFareDto,
      totalPrice: newTotalPrice,
    };

    return this.faresRepository.save(updatedFare);
  }

  async updateByFlightAndSeatClass(flightId: string, seatClassName: string, updateFareDto: UpdateFareDto): Promise<Fare> {
    // Find the fare by flight and seat class
    const fare = await this.faresRepository.findOne({
      where: { 
        flightId,
        seatClass: { name: seatClassName as any },
        isActive: true
      },
      relations: ['seatClass', 'flight'],
    });

    if (!fare) {
      throw new NotFoundException(`No active fare found for ${seatClassName} class on this flight`);
    }

    // Use the existing update method
    return this.update(fare.id, updateFareDto);
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

  private async validatePricingHierarchy(flightId: string, seatClassName: string, newTotalPrice: number, excludeFareId?: string): Promise<void> {
    // Get all existing fares for this flight
    const existingFares = await this.faresRepository.find({
      where: { flightId, isActive: true },
      relations: ['seatClass'],
    });

    // Filter out the fare being updated (if any)
    const otherFares = excludeFareId 
      ? existingFares.filter(f => f.id !== excludeFareId)
      : existingFares;

    // Define seat class hierarchy and pricing rules
    const seatClassHierarchy = {
      'economy': { priority: 1, name: 'Economy' },
      'business': { priority: 2, name: 'Business' },
      'first': { priority: 3, name: 'First' }
    };

    const currentClass = seatClassHierarchy[seatClassName];
    if (!currentClass) {
      throw new BadRequestException('Invalid seat class');
    }

    // Check pricing constraints
    for (const existingFare of otherFares) {
      const existingClass = seatClassHierarchy[existingFare.seatClass.name];
      
      if (!existingClass) continue;

      // Economy should be cheapest
      if (currentClass.priority === 1 && existingClass.priority > 1) {
        if (newTotalPrice >= Number(existingFare.totalPrice)) {
          throw new BadRequestException(
            `Economy class fare ($${newTotalPrice}) must be lower than ${existingClass.name} class fare ($${existingFare.totalPrice})`
          );
        }
      }

      // Business should be between Economy and First
      if (currentClass.priority === 2) {
        if (existingClass.priority === 1 && newTotalPrice <= Number(existingFare.totalPrice)) {
          throw new BadRequestException(
            `Business class fare ($${newTotalPrice}) must be higher than Economy class fare ($${existingFare.totalPrice})`
          );
        }
        if (existingClass.priority === 3 && newTotalPrice >= Number(existingFare.totalPrice)) {
          throw new BadRequestException(
            `Business class fare ($${newTotalPrice}) must be lower than First class fare ($${existingFare.totalPrice})`
          );
        }
      }

      // First should be most expensive
      if (currentClass.priority === 3 && existingClass.priority < 3) {
        if (newTotalPrice <= Number(existingFare.totalPrice)) {
          throw new BadRequestException(
            `First class fare ($${newTotalPrice}) must be higher than ${existingClass.name} class fare ($${existingFare.totalPrice})`
          );
        }
      }
    }
  }
} 