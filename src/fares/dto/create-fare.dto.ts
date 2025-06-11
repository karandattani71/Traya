import { IsUUID, IsNumber, IsString, IsOptional, IsDateString, IsBoolean, Min, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateFareDto {
  @ApiProperty({ description: 'ID of the flight' })
  @IsUUID()
  flightId: string;

  @ApiProperty({ description: 'ID of the seat class' })
  @IsUUID()
  seatClassId: string;

  @ApiProperty({ description: 'Base price of the fare', minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ description: 'Tax amount', minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax?: number = 0;

  @ApiPropertyOptional({ description: 'Service fee amount', minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  serviceFee?: number = 0;

  @ApiPropertyOptional({ description: 'Currency code', default: 'USD', maxLength: 3 })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string = 'USD';

  @ApiPropertyOptional({ description: 'Whether the fare is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Valid from date in ISO format', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid to date in ISO format', format: 'date-time' })
  @IsOptional()
  @IsDateString()
  validTo?: string;
} 