import { IsArray, IsString, IsUUID, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SeatSelectionDto {
  @ApiProperty({ description: 'Seat ID', example: 'e8077c34-f7e8-44aa-8ec2-9d0370efc14a' })
  @IsUUID()
  seatId: string;

  @ApiProperty({ description: 'Passenger name for this seat', example: 'John Doe' })
  @IsString()
  passengerName: string;
}

export class CalculateFareDto {
  @ApiProperty({ description: 'Flight ID', example: 'e8077c34-f7e8-44aa-8ec2-9d0370efc14a' })
  @IsUUID()
  flightId: string;

  @ApiProperty({ 
    description: 'Array of seat selections with passenger names',
    type: [SeatSelectionDto],
    example: [
      { seatId: 'seat-uuid-1', passengerName: 'John Doe' },
      { seatId: 'seat-uuid-2', passengerName: 'Jane Doe' }
    ]
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SeatSelectionDto)
  seats: SeatSelectionDto[];
} 