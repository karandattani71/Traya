import { Injectable, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeatClass, SeatClassName } from '../entities';

export interface CreateSeatClassDto {
  name: SeatClassName;
  description: string;
  priority: number;
}

@Injectable()
export class SeatClassesService implements OnModuleInit {
  constructor(
    @InjectRepository(SeatClass)
    private seatClassesRepository: Repository<SeatClass>,
  ) {}

  async onModuleInit() {
    // Initialize default seat classes if they don't exist
    await this.initializeDefaultSeatClasses();
  }

  async create(createSeatClassDto: CreateSeatClassDto): Promise<SeatClass> {
    try {
      const seatClass = this.seatClassesRepository.create(createSeatClassDto);
      return await this.seatClassesRepository.save(seatClass);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictException('Seat class already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<SeatClass[]> {
    return this.seatClassesRepository.find({
      order: { priority: 'ASC' },
    });
  }

  async findOne(id: string): Promise<SeatClass> {
    const seatClass = await this.seatClassesRepository.findOne({
      where: { id },
      relations: ['seats', 'fares'],
    });

    if (!seatClass) {
      throw new NotFoundException('Seat class not found');
    }

    return seatClass;
  }

  async findByName(name: SeatClassName): Promise<SeatClass | null> {
    return this.seatClassesRepository.findOne({
      where: { name },
    });
  }

  async update(id: string, updateSeatClassDto: Partial<CreateSeatClassDto>): Promise<SeatClass> {
    const seatClass = await this.findOne(id);

    Object.assign(seatClass, updateSeatClassDto);

    try {
      return await this.seatClassesRepository.save(seatClass);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictException('Seat class already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const seatClass = await this.findOne(id);
    await this.seatClassesRepository.remove(seatClass);
  }

  private async initializeDefaultSeatClasses(): Promise<void> {
    const defaultSeatClasses = [
      {
        name: SeatClassName.ECONOMY,
        description: 'Economy Class - Standard seating with basic amenities',
        priority: 1,
      },
      {
        name: SeatClassName.BUSINESS,
        description: 'Business Class - Enhanced comfort with premium services',
        priority: 2,
      },
      {
        name: SeatClassName.FIRST,
        description: 'First Class - Luxury seating with exclusive amenities',
        priority: 3,
      },
    ];

    for (const seatClassData of defaultSeatClasses) {
      const existing = await this.findByName(seatClassData.name);
      if (!existing) {
        await this.create(seatClassData);
      }
    }
  }
} 