import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { Flight } from './flight.entity';
import { SeatClass } from './seat-class.entity';
import { Booking } from './booking.entity';

export enum SeatStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  BLOCKED = 'blocked',
}

@Entity('seats')
@Index(['flight', 'seatNumber'], { unique: true })
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  seatNumber: string;

  @Column({
    type: 'enum',
    enum: SeatStatus,
    default: SeatStatus.AVAILABLE,
  })
  status: SeatStatus;

  @Column({ type: 'int' })
  row: number;

  @Column({ type: 'varchar', length: 1 })
  column: string; // A, B, C, D, E, F

  @ManyToOne(() => Flight, flight => flight.seats, { onDelete: 'CASCADE' })
  flight: Flight;

  @Column()
  flightId: string;

  @ManyToOne(() => SeatClass, seatClass => seatClass.seats)
  seatClass: SeatClass;

  @Column()
  seatClassId: string;

  @OneToMany(() => Booking, booking => booking.seat)
  bookings: Booking[];
} 