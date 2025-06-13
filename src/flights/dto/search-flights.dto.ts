import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchFlightsDto {
  @ApiProperty({ description: 'Origin airport code (e.g., JFK, LHR)', example: 'JFK' })
  @IsString()
  originCode: string;

  @ApiProperty({ description: 'Destination airport code (e.g., CDG, DXB)', example: 'LHR' })
  @IsString()
  destinationCode: string;

  @ApiProperty({ description: 'Departure date in YYYY-MM-DD format', format: 'date', example: '2024-12-07' })
  @IsDateString()
  departureDate: string;
} 