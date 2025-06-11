import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaresService } from './fares.service';
import { FaresController } from './fares.controller';
import { Fare, Flight, SeatClass } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Fare, Flight, SeatClass])],
  controllers: [FaresController],
  providers: [FaresService],
  exports: [FaresService],
})
export class FaresModule {} 