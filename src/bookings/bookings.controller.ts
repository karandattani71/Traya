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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('bookings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new booking',
    description: `
      Creates a new booking for a flight. The seat must be blocked first using the /seats/{id}/block endpoint.
      The booking will fail if:
      - The seat is not blocked by the current user
      - The seat is already booked
      - The flight has already departed
    `
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Booking created successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight, seat, or user not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Seat is already booked' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Seat is not blocked by the current user' })
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

  @Get('stats')
  @ApiOperation({ summary: 'Get booking statistics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking statistics' })
  async getStats() {
    return this.bookingsService.getBookingStats();
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
} 