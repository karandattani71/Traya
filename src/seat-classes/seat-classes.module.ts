import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatClassesService } from './seat-classes.service';
import { SeatClassesController } from './seat-classes.controller';
import { SeatClass } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([SeatClass])],
  controllers: [SeatClassesController],
  providers: [SeatClassesService],
  exports: [SeatClassesService],
})
export class SeatClassesModule {} 