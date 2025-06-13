import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  ParseUUIDPipe, 
  HttpStatus,
  UseGuards,
  ParseIntPipe 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody
} from '@nestjs/swagger';
import { FlightsService } from './flights.service';
import { CreateFlightDto } from './dto/create-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { UpdateFlightStatusDto } from './dto/update-flight-status.dto';
import { SeatClassName } from '../entities';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FlightDetailsDto } from './dto/flight-details.dto';

export class AddSeatsDto {
  seatClassName: SeatClassName;
  seatCount: number;
}

@ApiTags('flights')
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new flight (without seats or fares)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Flight created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Flight number already exists' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid flight data' })
  async create(@Body() createFlightDto: CreateFlightDto) {
    return this.flightsService.create(createFlightDto);
  }

  @Post(':id/seat-classes/:seatClassName/seats')
  @ApiOperation({ summary: 'Add seats for a specific seat class to a flight' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiParam({ name: 'seatClassName', description: 'Seat class name', enum: SeatClassName })
  @ApiQuery({ name: 'count', description: 'Number of seats to add', type: 'number' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Seats added successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight or seat class not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Seats for this class already exist' })
  async addSeatsForClass(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('seatClassName') seatClassName: SeatClassName,
    @Query('count', ParseIntPipe) count: number
  ) {
    return this.flightsService.addSeatsForClass(id, seatClassName, count);
  }

  @Delete(':id/seat-classes/:seatClassName/seats')
  @ApiOperation({ summary: 'Remove seats for a specific seat class from a flight' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiParam({ name: 'seatClassName', description: 'Seat class name', enum: SeatClassName })
  @ApiResponse({ status: HttpStatus.OK, description: 'Seats removed successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight, seat class, or seats not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Cannot remove seats that are booked' })
  async removeSeatsForClass(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('seatClassName') seatClassName: SeatClassName
  ) {
    return this.flightsService.removeSeatsForClass(id, seatClassName);
  }

  @Get(':id/seat-configuration')
  @ApiOperation({ summary: 'Get seat configuration for a flight' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Flight seat configuration' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
  async getFlightSeatConfiguration(@Param('id', ParseUUIDPipe) id: string) {
    return this.flightsService.getFlightSeatConfiguration(id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search flights by origin, destination and date' })
  @ApiQuery({ name: 'originCode', description: 'Origin airport code' })
  @ApiQuery({ name: 'destinationCode', description: 'Destination airport code' })
  @ApiQuery({ name: 'departureDate', description: 'Departure date (YYYY-MM-DD)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of matching flights' })
  async search(@Query() searchDto: SearchFlightsDto) {
    return this.flightsService.search(searchDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all flights' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of all flights' })
  async findAll() {
    return this.flightsService.findAll();
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Get detailed flight information including seat availability and fares' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Detailed flight information with seat availability and fares',
    type: FlightDetailsDto
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
  async getFlightDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.flightsService.getFlightDetails(id);
  }

  @Get(':id/seat-classes/:seatClassName/seats')
  @ApiOperation({ summary: 'Get available seats for a specific seat class in a flight' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiParam({ name: 'seatClassName', description: 'Seat class name (economy, business, first)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of available seats with their fares' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight or seat class not found' })
  async getAvailableSeatsWithFares(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('seatClassName') seatClassName: SeatClassName
  ) {
    return this.flightsService.getAvailableSeatsWithFares(id, seatClassName);
  }

  @Get(':id/seat-classes')
  @ApiOperation({ summary: 'Get all seat classes with fares for a flight' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of seat classes with their fares' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
  async getSeatClassesWithFares(@Param('id', ParseUUIDPipe) id: string) {
    return this.flightsService.getSeatClassesWithFares(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update flight information' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Flight updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Flight number already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateFlightDto: UpdateFlightDto
  ) {
    return this.flightsService.update(id, updateFlightDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update flight status' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Flight status updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateStatusDto: UpdateFlightStatusDto
  ) {
    return this.flightsService.updateStatus(id, updateStatusDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a flight' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Flight deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.flightsService.remove(id);
    return { message: 'Flight deleted successfully' };
  }
} 