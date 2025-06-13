import { IsString, IsUUID, IsEmail, IsPhoneNumber, Length, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookingPassengerDto {
  @ApiProperty({ description: 'Seat ID', example: 'e8077c34-f7e8-44aa-8ec2-9d0370efc14a' })
  @IsUUID()
  seatId: string;

  @ApiProperty({ description: 'Passenger full name', example: 'John Doe' })
  @IsString()
  @Length(2, 100)
  passengerName: string;

  @ApiProperty({ description: 'Passenger email', example: 'john.doe@example.com' })
  @IsEmail()
  passengerEmail: string;

  @ApiProperty({ description: 'Passenger phone number', example: '+1234567890' })
  @IsPhoneNumber()
  passengerPhone: string;
}

export class CreateBookingDto {
  @ApiProperty({ description: 'Flight ID', example: 'e8077c34-f7e8-44aa-8ec2-9d0370efc14a' })
  @IsUUID()
  flightId: string;

  @ApiProperty({ 
    description: 'Array of passenger bookings. Can be single passenger or multiple passengers.',
    type: [BookingPassengerDto],
    example: [
      {
        seatId: 'seat-uuid-1',
        passengerName: 'John Doe',
        passengerEmail: 'john.doe@example.com',
        passengerPhone: '+1234567890'
      },
      {
        seatId: 'seat-uuid-2',
        passengerName: 'Jane Doe',
        passengerEmail: 'jane.doe@example.com',
        passengerPhone: '+1234567891'
      }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingPassengerDto)
  passengers: BookingPassengerDto[];

  @ApiPropertyOptional({ 
    description: 'Primary contact email for the entire booking group (optional, will use first passenger email if not provided)',
    example: 'contact@example.com'
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ 
    description: 'Primary contact phone for the entire booking group (optional, will use first passenger phone if not provided)',
    example: '+1234567890'
  })
  @IsOptional()
  @IsPhoneNumber()
  contactPhone?: string;

  // Internal property set by the controller
  userId?: string;
} 