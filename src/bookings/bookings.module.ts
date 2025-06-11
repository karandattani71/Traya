import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { Booking, User, Flight, Seat, Fare } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, User, Flight, Seat, Fare])],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {} 