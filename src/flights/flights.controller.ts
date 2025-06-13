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
  UseGuards 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiQuery,
  ApiBearerAuth
} from '@nestjs/swagger';
import { FlightsService } from './flights.service';
import { CreateFlightDto } from './dto/create-flight.dto';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { UpdateFlightStatusDto } from './dto/update-flight-status.dto';
import { SeatClassName } from '../entities';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FlightDetailsDto } from './dto/flight-details.dto';

@ApiTags('flights')
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new flight' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Flight created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Flight number already exists' })
  async create(@Body() createFlightDto: CreateFlightDto) {
    return this.flightsService.create(createFlightDto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search available flights' })
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

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed flight information including seat classes and fares' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Flight details with seat availability and fares',
    type: FlightDetailsDto 
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
  async getFlightDetails(@Param('id', ParseUUIDPipe) id: string): Promise<FlightDetailsDto> {
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
  @ApiOperation({ summary: 'Update flight details' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Flight updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateFlightDto: Partial<CreateFlightDto>
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
  @ApiOperation({ summary: 'Delete flight' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Flight deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.flightsService.remove(id);
    return { message: 'Flight deleted successfully' };
  }
} 