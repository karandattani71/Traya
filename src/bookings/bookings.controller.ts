import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete,
  ParseUUIDPipe, 
  HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam 
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Booking created successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User, flight, or seat not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Seat is no longer available' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot book a cancelled flight' })
  async create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto);
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
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.findOne(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get bookings by user ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of user bookings' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.bookingsService.findByUser(userId);
  }

  @Get('reference/:bookingReference')
  @ApiOperation({ summary: 'Get booking by booking reference' })
  @ApiParam({ name: 'bookingReference', description: 'Booking reference number' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Booking found' })
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