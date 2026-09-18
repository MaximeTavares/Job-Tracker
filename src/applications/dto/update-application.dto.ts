import { ApplicationStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Volontairement limité à company/role/status : `platform`/`appliedAt`
 * restent des champs dérivés de la classification, non éditables ici.
 */
export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  company?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}
