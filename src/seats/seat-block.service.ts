import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Seat, SeatStatus } from '../entities';

@Injectable()
export class SeatBlockService {
  private readonly BLOCK_TIMEOUT_MINUTES = 10;

  constructor(
    @InjectRepository(Seat)
    private seatRepository: Repository<Seat>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredBlocks(): Promise<void> {
    try {
      const result = await this.seatRepository.update(
        {
          status: SeatStatus.BLOCKED,
          blockExpiresAt: LessThan(new Date())
        },
        {
          status: SeatStatus.AVAILABLE,
          blockExpiresAt: null,
          blockedByUserId: null
        }
      );
      
      if (result.affected > 0) {
        console.log(`Cleaned up ${result.affected} expired seat blocks`);
      }
    } catch (error) {
      console.error('Error cleaning up expired seat blocks:', error);
    }
  }

  async blockSeat(seatId: string, userId: string): Promise<void> {
    const result = await this.seatRepository.update(
      { id: seatId, status: SeatStatus.AVAILABLE },
      { 
        status: SeatStatus.BLOCKED,
        blockExpiresAt: new Date(Date.now() + this.BLOCK_TIMEOUT_MINUTES * 60000),
        blockedByUserId: userId
      }
    );

    if (result.affected === 0) {
      // Check if seat exists and why it couldn't be blocked
      const seat = await this.seatRepository.findOne({ where: { id: seatId } });
      if (!seat) {
        throw new ConflictException('Seat not found');
      }
      if (seat.status === SeatStatus.BOOKED) {
        throw new ConflictException('Seat is already booked');
      }
      if (seat.status === SeatStatus.BLOCKED) {
        if (seat.blockedByUserId === userId) {
          // User is trying to block their own already blocked seat - extend the time
          await this.seatRepository.update(
            { id: seatId },
            { blockExpiresAt: new Date(Date.now() + this.BLOCK_TIMEOUT_MINUTES * 60000) }
          );
          return;
        }
        throw new ConflictException('Seat is currently blocked by another user');
      }
      throw new ConflictException('Seat is not available for blocking');
    }
  }

  async unblockSeat(seatId: string, userId?: string): Promise<void> {
    if (userId) {
      // Only allow the user who blocked the seat to unblock it
      const result = await this.seatRepository.update(
        { id: seatId, status: SeatStatus.BLOCKED, blockedByUserId: userId },
        { 
          status: SeatStatus.AVAILABLE,
          blockExpiresAt: null,
          blockedByUserId: null
        }
      );

      if (result.affected === 0) {
        const seat = await this.seatRepository.findOne({ where: { id: seatId } });
        if (!seat) {
          throw new ConflictException('Seat not found');
        }
        if (seat.status !== SeatStatus.BLOCKED) {
          throw new ConflictException('Seat is not blocked');
        }
        if (seat.blockedByUserId !== userId) {
          throw new UnauthorizedException('You can only unblock seats that you have blocked');
        }
      }
    } else {
      // System cleanup - can unblock any blocked seat
      await this.seatRepository.update(
        { id: seatId, status: SeatStatus.BLOCKED },
        { 
          status: SeatStatus.AVAILABLE,
          blockExpiresAt: null,
          blockedByUserId: null
        }
      );
    }
  }

  async isBlockedByUser(seatId: string, userId: string): Promise<boolean> {
    const seat = await this.seatRepository.findOne({
      where: { id: seatId }
    });
    return seat?.status === SeatStatus.BLOCKED && seat?.blockedByUserId === userId;
  }

  async isBlocked(seatId: string): Promise<boolean> {
    const seat = await this.seatRepository.findOne({
      where: { id: seatId }
    });
    return seat?.status === SeatStatus.BLOCKED;
  }

  async blockMultipleSeats(seatIds: string[], userId: string): Promise<{
    successful: string[];
    summary: { total: number; blocked: number };
  }> {
    if (seatIds.length === 0) {
      throw new BadRequestException('At least one seat ID is required');
    }

    // Remove duplicates
    const uniqueSeatIds = [...new Set(seatIds)];
    
    // Get all seats to validate and check their current status
    const seats = await this.seatRepository.find({
      where: { id: In(uniqueSeatIds) },
      select: ['id', 'seatNumber', 'status', 'blockedByUserId']
    });

    // Check for non-existent seats
    const foundSeatIds = seats.map(seat => seat.id);
    const notFoundSeatIds = uniqueSeatIds.filter(id => !foundSeatIds.includes(id));
    
    if (notFoundSeatIds.length > 0) {
      throw new BadRequestException(`Seats not found: ${notFoundSeatIds.join(', ')}`);
    }

    // Validate ALL seats first - fail fast if any seat cannot be blocked
    const validationErrors: string[] = [];
    
    for (const seat of seats) {
      if (seat.status === SeatStatus.BOOKED) {
        validationErrors.push(`Seat ${seat.seatNumber} is already booked`);
      } else if (seat.status === SeatStatus.BLOCKED && seat.blockedByUserId !== userId) {
        validationErrors.push(`Seat ${seat.seatNumber} is currently blocked by another user`);
      }
    }

    // If any validation errors, throw exception without blocking any seats
    if (validationErrors.length > 0) {
      throw new ConflictException(`Cannot block seats: ${validationErrors.join(', ')}`);
    }

    // All seats are valid - proceed with blocking
    const successful: string[] = [];
    const seatsToBlock: string[] = [];
    const seatsToExtend: string[] = [];

    // Categorize seats
    for (const seat of seats) {
      if (seat.status === SeatStatus.AVAILABLE) {
        seatsToBlock.push(seat.id);
      } else if (seat.status === SeatStatus.BLOCKED && seat.blockedByUserId === userId) {
        // User's own blocked seats - extend the time
        seatsToExtend.push(seat.id);
      }
    }

    try {
      // Block available seats in bulk
      if (seatsToBlock.length > 0) {
        const blockResult = await this.seatRepository.update(
          { id: In(seatsToBlock), status: SeatStatus.AVAILABLE },
          { 
            status: SeatStatus.BLOCKED,
            blockExpiresAt: new Date(Date.now() + this.BLOCK_TIMEOUT_MINUTES * 60000),
            blockedByUserId: userId
          }
        );

        if (blockResult.affected !== seatsToBlock.length) {
          // Some seats couldn't be blocked (race condition)
          throw new ConflictException('Some seats were taken by another user during the blocking process. Please try again.');
        }

        successful.push(...seatsToBlock);
      }

      // Extend time for already blocked seats by the same user
      if (seatsToExtend.length > 0) {
        await this.seatRepository.update(
          { id: In(seatsToExtend) },
          { blockExpiresAt: new Date(Date.now() + this.BLOCK_TIMEOUT_MINUTES * 60000) }
        );

        successful.push(...seatsToExtend);
      }

      return {
        successful,
        summary: {
          total: uniqueSeatIds.length,
          blocked: successful.length
        }
      };

    } catch (error) {
      // If blocking fails, try to rollback any seats that might have been blocked
      if (seatsToBlock.length > 0) {
        try {
          await this.seatRepository.update(
            { id: In(seatsToBlock), blockedByUserId: userId },
            { 
              status: SeatStatus.AVAILABLE,
              blockExpiresAt: null,
              blockedByUserId: null
            }
          );
        } catch (rollbackError) {
          console.error('Failed to rollback seat blocks:', rollbackError);
        }
      }
      
      throw error;
    }
  }

  async unblockMultipleSeats(seatIds: string[], userId?: string): Promise<{
    successful: string[];
    summary: { total: number; unblocked: number };
  }> {
    if (seatIds.length === 0) {
      throw new BadRequestException('At least one seat ID is required');
    }

    // Remove duplicates
    const uniqueSeatIds = [...new Set(seatIds)];
    
    // Get all seats to validate and check their current status
    const seats = await this.seatRepository.find({
      where: { id: In(uniqueSeatIds) },
      select: ['id', 'seatNumber', 'status', 'blockedByUserId']
    });

    // Check for non-existent seats
    const foundSeatIds = seats.map(seat => seat.id);
    const notFoundSeatIds = uniqueSeatIds.filter(id => !foundSeatIds.includes(id));
    
    if (notFoundSeatIds.length > 0) {
      throw new BadRequestException(`Seats not found: ${notFoundSeatIds.join(', ')}`);
    }

    // Validate ALL seats first - fail fast if any seat cannot be unblocked
    const validationErrors: string[] = [];
    
    for (const seat of seats) {
      if (seat.status !== SeatStatus.BLOCKED) {
        validationErrors.push(`Seat ${seat.seatNumber} is not blocked (current status: ${seat.status})`);
      } else if (userId && seat.blockedByUserId !== userId) {
        validationErrors.push(`Seat ${seat.seatNumber} was not blocked by you`);
      }
    }

    // If any validation errors, throw exception without unblocking any seats
    if (validationErrors.length > 0) {
      throw new ConflictException(`Cannot unblock seats: ${validationErrors.join(', ')}`);
    }

    // All seats are valid - proceed with unblocking
    const seatsToUnblock = seats.map(seat => seat.id);

    try {
      // Unblock all seats in bulk
      const updateCondition = userId 
        ? { id: In(seatsToUnblock), status: SeatStatus.BLOCKED, blockedByUserId: userId }
        : { id: In(seatsToUnblock), status: SeatStatus.BLOCKED };

      const result = await this.seatRepository.update(
        updateCondition,
        { 
          status: SeatStatus.AVAILABLE,
          blockExpiresAt: null,
          blockedByUserId: null
        }
      );

      if (result.affected !== seatsToUnblock.length) {
        throw new ConflictException('Some seats could not be unblocked. They may have been modified by another process.');
      }

      return {
        successful: seatsToUnblock,
        summary: {
          total: uniqueSeatIds.length,
          unblocked: seatsToUnblock.length
        }
      };

    } catch (error) {
      throw error;
    }
  }
} 