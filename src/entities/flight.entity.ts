import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Seat } from './seat.entity';
import { Fare } from './fare.entity';
import { Booking } from './booking.entity';

export enum FlightStatus {
  ON_TIME = 'on_time',
  DELAYED = 'delayed',
  CANCELLED = 'cancelled',
}

@Entity('flights')
export class Flight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  flightNumber: string;

  @Column({ type: 'varchar', length: 100 })
  origin: string;

  @Column({ type: 'varchar', length: 100 })
  destination: string;

  @Column({ type: 'timestamp' })
  departureTime: Date;

  @Column({ type: 'timestamp' })
  arrivalTime: Date;

  @Column({ type: 'varchar', length: 50 })
  aircraft: string;

  @Column({
    type: 'enum',
    enum: FlightStatus,
    default: FlightStatus.ON_TIME,
  })
  status: FlightStatus;

  @Column({ type: 'int', default: 0 })
  totalSeats: number;

  @Column({ type: 'int', default: 0 })
  availableSeats: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Seat, seat => seat.flight, { cascade: true })
  seats: Seat[];

  @OneToMany(() => Fare, fare => fare.flight, { cascade: true })
  fares: Fare[];

  @OneToMany(() => Booking, booking => booking.flight)
  bookings: Booking[];
} 