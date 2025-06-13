import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FlightStatus } from '../../entities';
 
export class UpdateFlightStatusDto {
  @ApiProperty({ description: 'New flight status', enum: FlightStatus })
  @IsEnum(FlightStatus)
  status: FlightStatus;
} 