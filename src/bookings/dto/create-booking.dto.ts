import { IsString, IsEmail, IsOptional, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID of the user making the booking' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'ID of the flight to book' })
  @IsUUID()
  flightId: string;

  @ApiProperty({ description: 'ID of the seat to book' })
  @IsUUID()
  seatId: string;

  @ApiProperty({ description: 'Passenger full name', maxLength: 100 })
  @IsString()
  @Length(1, 100)
  passengerName: string;

  @ApiProperty({ description: 'Passenger email address', format: 'email' })
  @IsEmail()
  passengerEmail: string;

  @ApiPropertyOptional({ description: 'Passenger phone number', maxLength: 15 })
  @IsOptional()
  @IsString()
  @Length(1, 15)
  passengerPhone?: string;
} 