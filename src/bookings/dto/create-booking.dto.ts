import { IsString, IsUUID, IsEmail, IsPhoneNumber, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ description: 'Flight ID' })
  @IsUUID()
  flightId: string;

  @ApiProperty({ description: 'Seat ID' })
  @IsUUID()
  seatId: string;

  @ApiProperty({ description: 'Passenger full name' })
  @IsString()
  @Length(2, 100)
  passengerName: string;

  @ApiProperty({ description: 'Passenger email' })
  @IsEmail()
  passengerEmail: string;

  @ApiProperty({ description: 'Passenger phone number' })
  @IsPhoneNumber()
  passengerPhone: string;

  // Internal property set by the controller
  userId?: string;
} 