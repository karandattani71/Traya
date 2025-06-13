import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete,
  ParseUUIDPipe, 
  HttpStatus,
  UseGuards,
  Request
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiBearerAuth
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CalculateFareDto } from './dto/calculate-fare.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('bookings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create booking(s) for one or multiple passengers',
    description: `
      Creates booking(s) for a flight. Supports both single and multiple passenger bookings in one request.
      
      **Single Passenger:** Returns a single booking object
      **Multiple Passengers:** Returns an object with booking array, total amount, and summary
      
      All seats must be blocked first using the /seats/{id}/block endpoint.
      The booking will fail if:
      - Any seat is not blocked by the current user
      - Any seat is already booked
      - The flight has already departed
      
      **Examples:**
      
      Single passenger:
      \`\`\`json
      {
        "flightId": "flight-uuid",
        "passengers": [
          {
            "seatId": "seat-uuid",
            "passengerName": "John Doe",
            "passengerEmail": "john@example.com",
            "passengerPhone": "+1234567890"
          }
        ]
      }
      \`\`\`
      
      Multiple passengers:
      \`\`\`json
      {
        "flightId": "flight-uuid",
        "passengers": [
          {
            "seatId": "seat-uuid-1",
            "passengerName": "John Doe",
            "passengerEmail": "john@example.com",
            "passengerPhone": "+1234567890"
          },
          {
            "seatId": "seat-uuid-2",
            "passengerName": "Jane Doe",
            "passengerEmail": "jane@example.com",
            "passengerPhone": "+1234567891"
          }
        ],
        "contactEmail": "family@example.com",
        "contactPhone": "+1234567890"
      }
      \`\`\`
    `
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Booking(s) created successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight, seat(s), or user not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'One or more seats are already booked' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'One or more seats are not blocked by the current user' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid request data or seats not blocked by user' })
  async create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    // Create a new object to avoid modifying the DTO directly
    const bookingData = {
      ...createBookingDto,
      userId: req.user.sub // Get userId from JWT token's sub claim
    };
    
    return this.bookingsService.create(bookingData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of all bookings' })
  async findAll() {
    return this.bookingsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.findOne(id);
  }

  @Get('user/me')
  @ApiOperation({ summary: 'Get current user bookings' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of user bookings' })
  async findMyBookings(@Request() req) {
    return this.bookingsService.findByUser(req.user.sub);
  }

  @Get('reference/:bookingReference')
  @ApiOperation({ summary: 'Get booking by reference number' })
  @ApiParam({ name: 'bookingReference', description: 'Booking reference number' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  async findByReference(@Param('bookingReference') bookingReference: string) {
    return this.bookingsService.findByBookingReference(bookingReference);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking cancelled successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Booking already cancelled or flight departed' })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.cancel(id);
  }

  @Post('calculate-fare')
  @ApiOperation({ 
    summary: 'Calculate total fare for multiple seats',
    description: `
      Calculate the total fare for multiple seats before booking. This endpoint helps users:
      - See the total cost for multiple passengers
      - Verify seat availability
      - Get detailed breakdown of fares by seat class
      - Plan multi-passenger bookings with different seat classes
      
      **Note:** You can also use the main POST /bookings endpoint for actual booking after calculation.
    `
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fare calculation completed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight, seats, or fares not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'One or more seats are not available' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Seats do not belong to the specified flight' })
  async calculateFare(@Body() calculateFareDto: CalculateFareDto) {
    return this.bookingsService.calculateFare(calculateFareDto);
  }
} 