import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MultiSeatBlockDto {
  @ApiProperty({ 
    description: 'Array of seat IDs to block',
    type: [String],
    example: [
      'e8077c34-f7e8-44aa-8ec2-9d0370efc14a',
      '350a4259-1aa8-4df5-9475-710cce4b2fd3',
      '0c74d767-3808-49fa-bd5a-6629aa02a20c'
    ],
    minItems: 1,
    maxItems: 10
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10) // Limit to prevent abuse
  @IsUUID(4, { each: true })
  seatIds: string[];
}

export class MultiSeatUnblockDto {
  @ApiProperty({ 
    description: 'Array of seat IDs to unblock',
    type: [String],
    example: [
      'e8077c34-f7e8-44aa-8ec2-9d0370efc14a',
      '350a4259-1aa8-4df5-9475-710cce4b2fd3',
      '0c74d767-3808-49fa-bd5a-6629aa02a20c'
    ],
    minItems: 1,
    maxItems: 10
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10) // Limit to prevent abuse
  @IsUUID(4, { each: true })
  seatIds: string[];
} 