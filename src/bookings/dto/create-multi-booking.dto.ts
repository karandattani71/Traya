import { IsArray, IsString, IsUUID, IsEmail, IsOptional, ValidateNested, ArrayMinSize, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PassengerSeatDto {
  @ApiProperty({ description: 'Seat ID', example: 'e8077c34-f7e8-44aa-8ec2-9d0370efc14a' })
  @IsUUID()
  seatId: string;

  @ApiProperty({ description: 'Passenger full name', example: 'John Doe' })
  @IsString()
  @Length(2, 100)
  passengerName: string;

  @ApiPropertyOptional({ description: 'Passenger email', example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  passengerEmail?: string;

  @ApiPropertyOptional({ description: 'Passenger phone number', example: '+1234567890' })
  @IsOptional()
  @IsString()
  @Length(10, 15)
  passengerPhone?: string;
}

export class CreateMultiBookingDto {
  @ApiProperty({ description: 'User ID making the booking', example: 'user-uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Flight ID', example: 'e8077c34-f7e8-44aa-8ec2-9d0370efc14a' })
  @IsUUID()
  flightId: string;

  @ApiProperty({ 
    description: 'Array of passenger seat selections',
    type: [PassengerSeatDto],
    example: [
      { 
        seatId: 'seat-uuid-1', 
        passengerName: 'John Doe',
        passengerEmail: 'john@example.com',
        passengerPhone: '+1234567890'
      },
      { 
        seatId: 'seat-uuid-2', 
        passengerName: 'Jane Doe',
        passengerEmail: 'jane@example.com',
        passengerPhone: '+1234567891'
      }
    ]
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerSeatDto)
  passengers: PassengerSeatDto[];

  @ApiPropertyOptional({ description: 'Primary contact email for the booking', example: 'contact@example.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Primary contact phone for the booking', example: '+1234567890' })
  @IsOptional()
  @IsString()
  @Length(10, 15)
  contactPhone?: string;
} 