import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seat } from '../entities';
import { SeatBlockService } from './seat-block.service';
import { SeatsController } from './seats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Seat])],
  controllers: [SeatsController],
  providers: [SeatBlockService],
  exports: [SeatBlockService],
})
export class SeatsModule {} 