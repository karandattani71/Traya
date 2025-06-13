import { 
  Controller, 
  Get, 
  Param,
  ParseUUIDPipe,
  HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse,
  ApiParam 
} from '@nestjs/swagger';
import { SeatClassesService } from './seat-classes.service';

@ApiTags('seat-classes')
@Controller('seat-classes')
export class SeatClassesController {
  constructor(private readonly seatClassesService: SeatClassesService) {}

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
} 