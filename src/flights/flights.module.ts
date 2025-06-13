import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlightsService } from './flights.service';
import { FlightsController } from './flights.controller';
import { Flight, Seat, SeatClass, Fare } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Flight, Seat, SeatClass, Fare])],
  controllers: [FlightsController],
  providers: [FlightsService],
  exports: [FlightsService],
})
export class FlightsModule {} 