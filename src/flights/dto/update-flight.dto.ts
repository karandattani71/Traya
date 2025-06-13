import { IsString, IsDateString, Length, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFlightDto {
  @ApiPropertyOptional({ description: 'Flight number', minLength: 3, maxLength: 10, example: 'AI302' })
  @IsOptional()
  @IsString()
  @Length(3, 10)
  flightNumber?: string;

  @ApiPropertyOptional({ description: 'Origin airport/city', maxLength: 100, example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  origin?: string;

  @ApiPropertyOptional({ description: 'Destination airport/city', maxLength: 100, example: 'Bangalore' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  destination?: string;

  @ApiPropertyOptional({ description: 'Origin airport code (e.g., JFK, LHR)', maxLength: 10, example: 'BOM' })
  @IsOptional()
  @IsString()
  @Length(3, 10)
  originCode?: string;

  @ApiPropertyOptional({ description: 'Destination airport code (e.g., CDG, DXB)', maxLength: 10, example: 'BLR' })
  @IsOptional()
  @IsString()
  @Length(3, 10)
  destinationCode?: string;

  @ApiPropertyOptional({ description: 'Departure time in ISO format', format: 'date-time', example: '2025-06-15T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  departureTime?: string;

  @ApiPropertyOptional({ description: 'Arrival time in ISO format', format: 'date-time', example: '2025-06-15T13:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  arrivalTime?: string;

  @ApiPropertyOptional({ description: 'Aircraft type/model', maxLength: 50, example: 'Boeing 737' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  aircraft?: string;
} 