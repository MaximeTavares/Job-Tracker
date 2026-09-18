import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ListApplicationsQueryDto } from './dto/list-applications.query.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  findAll(@Query() query: ListApplicationsQueryDto) {
    return this.applicationsService.findAll(query);
  }

  /**
   * Déclarée avant un éventuel futur `GET /applications/:id`, sinon `stats`
   * serait interprété comme un `:id`.
   */
  @Get('stats')
  stats() {
    return this.applicationsService.stats();
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.remove(id);
  }
}
