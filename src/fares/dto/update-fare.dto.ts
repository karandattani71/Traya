import { IsNumber, IsOptional, Min, IsString, Length } from 'class-validator';
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

  @ApiPropertyOptional({ 
    description: 'Currency code (3-letter ISO code)', 
    example: 'USD',
    maxLength: 3,
    minLength: 3
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
} 