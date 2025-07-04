import { IsString, IsDateString, Length, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFlightDto {
  @ApiProperty({ description: 'Flight number', minLength: 3, maxLength: 10 })
  @IsString()
  @Length(3, 10)
  flightNumber: string;

  @ApiProperty({ description: 'Origin airport/city', maxLength: 100 })
  @IsString()
  @Length(1, 100)
  origin: string;

  @ApiProperty({ description: 'Destination airport/city', maxLength: 100 })
  @IsString()
  @Length(1, 100)
  destination: string;

  @ApiProperty({ description: 'Origin airport code (e.g., JFK, LHR)', maxLength: 10 })
  @IsString()
  @Length(3, 10)
  originCode: string;

  @ApiProperty({ description: 'Destination airport code (e.g., CDG, DXB)', maxLength: 10 })
  @IsString()
  @Length(3, 10)
  destinationCode: string;

  @ApiProperty({ description: 'Departure time in ISO format', format: 'date-time' })
  @IsDateString()
  departureTime: string;

  @ApiProperty({ description: 'Arrival time in ISO format', format: 'date-time' })
  @IsDateString()
  arrivalTime: string;

  @ApiProperty({ description: 'Aircraft type/model', maxLength: 50 })
  @IsString()
  @Length(1, 50)
  aircraft: string;
} 