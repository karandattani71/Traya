import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { Flight } from './flight.entity';
import { Seat } from './seat.entity';

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  bookingReference: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  passengerName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passengerEmail: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  passengerPhone: string;

  @Column({ type: 'timestamp', nullable: true })
  bookingDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  paymentDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, user => user.bookings)
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Flight, flight => flight.bookings)
  flight: Flight;

  @Column()
  flightId: string;

  @ManyToOne(() => Seat, seat => seat.bookings)
  seat: Seat;

  @Column()
  seatId: string;
} 