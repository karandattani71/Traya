import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Seat } from './seat.entity';
import { Fare } from './fare.entity';

export enum SeatClassName {
  ECONOMY = 'economy',
  BUSINESS = 'business',
  FIRST = 'first',
}

@Entity('seat_classes')
export class SeatClass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SeatClassName,
    unique: true,
  })
  name: SeatClassName;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'int' })
  priority: number; // 1 = Economy (lowest), 2 = Business, 3 = First (highest)

  @OneToMany(() => Seat, seat => seat.seatClass)
  seats: Seat[];

  @OneToMany(() => Fare, fare => fare.seatClass)
  fares: Fare[];
} 