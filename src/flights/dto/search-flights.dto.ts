import { IsString, IsDateString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SeatClassName } from '../../entities';

export class SearchFlightsDto {
  @ApiProperty({ description: 'Origin airport/city' })
  @IsString()
  origin: string;

  @ApiProperty({ description: 'Destination airport/city' })
  @IsString()
  destination: string;

  @ApiProperty({ description: 'Departure date in YYYY-MM-DD format', format: 'date' })
  @IsDateString()
  departureDate: string;

  @ApiPropertyOptional({ description: 'Preferred seat class', enum: SeatClassName })
  @IsOptional()
  @IsEnum(SeatClassName)
  seatClass?: SeatClassName;

  @ApiPropertyOptional({ description: 'Number of passengers', minimum: 1, maximum: 10, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  passengers?: number = 1;
} 