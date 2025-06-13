import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { FlightsModule } from './flights/flights.module';
import { BookingsModule } from './bookings/bookings.module';
import { FaresModule } from './fares/fares.module';
import { SeatClassesModule } from './seat-classes/seat-classes.module';
import { AuthModule } from './auth/auth.module';
import { SeatsModule } from './seats/seats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    FlightsModule,
    BookingsModule,
    FaresModule,
    SeatClassesModule,
    SeatsModule,
  ],
})
export class AppModule {} 