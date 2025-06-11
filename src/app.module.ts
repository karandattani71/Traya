import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { FlightsModule } from './flights/flights.module';
import { BookingsModule } from './bookings/bookings.module';
import { FaresModule } from './fares/fares.module';
import { SeatClassesModule } from './seat-classes/seat-classes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    UsersModule,
    FlightsModule,
    BookingsModule,
    FaresModule,
    SeatClassesModule,
  ],
})
export class AppModule {} 