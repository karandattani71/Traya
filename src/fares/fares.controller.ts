import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
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
import { FaresService } from './fares.service';
import { CreateFareDto } from './dto/create-fare.dto';

@ApiTags('fares')
@Controller('fares')
export class FaresController {
  constructor(private readonly faresService: FaresService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new fare' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Fare created successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight or seat class not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Fare already exists for this flight and seat class' })
  async create(@Body() createFareDto: CreateFareDto) {
    return this.faresService.create(createFareDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all fares' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of all fares' })
  async findAll() {
    return this.faresService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active fares' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of active fares' })
  async getActiveFares() {
    return this.faresService.getActiveFares();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fare by ID' })
  @ApiParam({ name: 'id', description: 'Fare ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fare found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Fare not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.faresService.findOne(id);
  }

  @Get('flight/:flightId')
  @ApiOperation({ summary: 'Get fares by flight ID' })
  @ApiParam({ name: 'flightId', description: 'Flight ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of flight fares' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
  async findByFlight(@Param('flightId', ParseUUIDPipe) flightId: string) {
    return this.faresService.findByFlight(flightId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update fare' })
  @ApiParam({ name: 'id', description: 'Fare ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fare updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Fare not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateFareDto: Partial<CreateFareDto>
  ) {
    return this.faresService.update(id, updateFareDto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate fare' })
  @ApiParam({ name: 'id', description: 'Fare ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fare activated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Fare not found' })
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.faresService.activate(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate fare' })
  @ApiParam({ name: 'id', description: 'Fare ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fare deactivated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Fare not found' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.faresService.deactivate(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete fare' })
  @ApiParam({ name: 'id', description: 'Fare ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Fare deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Fare not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.faresService.remove(id);
    return { message: 'Fare deleted successfully' };
  }
} 