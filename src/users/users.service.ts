import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const user = this.usersRepository.create({
        ...createUserDto,
        dateOfBirth: createUserDto.dateOfBirth ? new Date(createUserDto.dateOfBirth) : null,
      });
      return await this.usersRepository.save(user);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['bookings'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['bookings', 'bookings.flight', 'bookings.seat'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: Partial<CreateUserDto>): Promise<User> {
    const user = await this.findOne(id);
    
    Object.assign(user, {
      ...updateUserDto,
      dateOfBirth: updateUserDto.dateOfBirth ? new Date(updateUserDto.dateOfBirth) : user.dateOfBirth,
    });

    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
} 