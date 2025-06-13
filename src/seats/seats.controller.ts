import { Controller, Post, Param, UseGuards, HttpStatus, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SeatBlockService } from './seat-block.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('seats')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('seats')
export class SeatsController {
  constructor(private readonly seatBlockService: SeatBlockService) {}

  @Post(':id/block')
  @ApiOperation({ summary: 'Block a seat for booking' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Seat blocked successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Seat is not available or already blocked by another user' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Seat not found' })
  async blockSeat(@Param('id') id: string, @Request() req) {
    await this.seatBlockService.blockSeat(id, req.user.sub);
    return { message: 'Seat blocked successfully' };
  }

  @Post(':id/unblock')
  @ApiOperation({ summary: 'Unblock a previously blocked seat' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Seat unblocked successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'You can only unblock seats that you have blocked' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Seat not found' })
  async unblockSeat(@Param('id') id: string, @Request() req) {
    await this.seatBlockService.unblockSeat(id, req.user.sub);
    return { message: 'Seat unblocked successfully' };
  }
} 