import { Flight, SeatClass } from '../../entities';

interface SeatClassInfo {
  total: number;
  available: number;
  seatClass: SeatClass;
  fare?: {
    basePrice: number;
    tax: number;
    serviceFee: number;
    totalPrice: number;
    currency: string;
  };
}

export class FlightDetailsDto extends Flight {
  seatAvailability: Record<string, SeatClassInfo>;
} 