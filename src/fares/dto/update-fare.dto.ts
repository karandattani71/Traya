import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFareDto {
  @ApiPropertyOptional({ description: 'Base price of the fare', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({ description: 'Tax amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({ description: 'Service fee', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceFee?: number;
} 