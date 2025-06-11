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
import { SeatClassesService, CreateSeatClassDto } from './seat-classes.service';

@ApiTags('seat-classes')
@Controller('seat-classes')
export class SeatClassesController {
  constructor(private readonly seatClassesService: SeatClassesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new seat class' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Seat class created successfully' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Seat class already exists' })
  async create(@Body() createSeatClassDto: CreateSeatClassDto) {
    return this.seatClassesService.create(createSeatClassDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all seat classes' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of all seat classes' })
  async findAll() {
    return this.seatClassesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get seat class by ID' })
  @ApiParam({ name: 'id', description: 'Seat class ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Seat class found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Seat class not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.seatClassesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update seat class' })
  @ApiParam({ name: 'id', description: 'Seat class ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Seat class updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Seat class not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateSeatClassDto: Partial<CreateSeatClassDto>
  ) {
    return this.seatClassesService.update(id, updateSeatClassDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete seat class' })
  @ApiParam({ name: 'id', description: 'Seat class ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Seat class deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Seat class not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.seatClassesService.remove(id);
    return { message: 'Seat class deleted successfully' };
  }
} 