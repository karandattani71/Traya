import { Controller, Post, UseGuards, HttpStatus, Request, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SeatBlockService } from './seat-block.service';
import { MultiSeatBlockDto, MultiSeatUnblockDto } from './dto/multi-seat-operation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('seats')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('seats')
export class SeatsController {
  constructor(private readonly seatBlockService: SeatBlockService) {}



  @Post('block-multiple')
  @ApiOperation({ 
    summary: 'Block multiple seats at once (All-or-Nothing)',
    description: `
      Block multiple seats in a single request using an all-or-nothing approach. This is useful for:
      - Family/group bookings where all seats must be secured together
      - Booking multiple seats across different classes
      - Efficient seat selection for multi-passenger trips
      
      **Features:**
      - Blocks up to 10 seats at once
      - All-or-nothing approach: either ALL seats are blocked or NONE are blocked
      - Validates all seats before attempting to block any
      - Extends block time for already blocked seats by the same user
      - Removes duplicate seat IDs automatically
      - Clear error messages indicating which seats caused the failure
      
      **Response includes:**
      - List of successfully blocked seats (all requested seats on success)
      - Summary with counts
      
      **Error Handling:**
      - If ANY seat cannot be blocked, the entire operation fails
      - Detailed error message shows which seats caused the failure
    `
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'All seats blocked successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request data, no seats provided, or seats not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'One or more seats cannot be blocked (already booked or blocked by another user)' })
  async blockMultipleSeats(@Body() multiSeatBlockDto: MultiSeatBlockDto, @Request() req) {
    const result = await this.seatBlockService.blockMultipleSeats(multiSeatBlockDto.seatIds, req.user.sub);
    
    return {
      message: `Successfully blocked all ${result.summary.blocked} seats`,
      ...result
    };
  }

  @Post('unblock-multiple')
  @ApiOperation({ 
    summary: 'Unblock multiple seats at once (All-or-Nothing)',
    description: `
      Unblock multiple seats in a single request using an all-or-nothing approach. This is useful for:
      - Releasing seats when changing booking plans
      - Bulk unblocking after booking completion
      - Cleaning up blocked seats
      
      **Features:**
      - Unblocks up to 10 seats at once
      - All-or-nothing approach: either ALL seats are unblocked or NONE are unblocked
      - Only unblocks seats that were blocked by the current user
      - Validates all seats before attempting to unblock any
      - Removes duplicate seat IDs automatically
      - Clear error messages indicating which seats caused the failure
      
      **Response includes:**
      - List of successfully unblocked seats (all requested seats on success)
      - Summary with counts
      
      **Error Handling:**
      - If ANY seat cannot be unblocked, the entire operation fails
      - Detailed error message shows which seats caused the failure
    `
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'All seats unblocked successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request data, no seats provided, or seats not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'One or more seats cannot be unblocked (not blocked or blocked by another user)' })
  async unblockMultipleSeats(@Body() multiSeatUnblockDto: MultiSeatUnblockDto, @Request() req) {
    const result = await this.seatBlockService.unblockMultipleSeats(multiSeatUnblockDto.seatIds, req.user.sub);
    
    return {
      message: `Successfully unblocked all ${result.summary.unblocked} seats`,
      ...result
    };
  }
} 