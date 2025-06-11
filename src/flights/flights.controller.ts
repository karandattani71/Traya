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
  HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiQuery 
} from '@nestjs/swagger';
import { FlightsService } from './flights.service';
import { CreateFlightDto } from './dto/create-flight.dto';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { UpdateFlightStatusDto } from './dto/update-flight-status.dto';
import { SeatClassName } from '../entities';

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
  @ApiOperation({ summary: 'Search flights between locations' })
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
  @ApiOperation({ summary: 'Get flight by ID' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Flight found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.flightsService.findOne(id);
  }

  @Get(':id/seats')
  @ApiOperation({ summary: 'Get available seats for a flight' })
  @ApiParam({ name: 'id', description: 'Flight ID' })
  @ApiQuery({ name: 'seatClass', required: false, enum: SeatClassName })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of available seats' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
  async getAvailableSeats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('seatClass') seatClass?: SeatClassName
  ) {
    return this.flightsService.getAvailableSeats(id, seatClass);
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