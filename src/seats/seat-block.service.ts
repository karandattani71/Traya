import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
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
} 