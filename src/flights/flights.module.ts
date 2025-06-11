import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlightsService } from './flights.service';
import { FlightsController } from './flights.controller';
import { Flight, Seat, SeatClass } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Flight, Seat, SeatClass])],
  controllers: [FlightsController],
  providers: [FlightsService],
  exports: [FlightsService],
})
export class FlightsModule {} 