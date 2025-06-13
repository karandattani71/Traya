import { IsEmail, IsString, IsOptional, Length, IsDateString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'First name of the user', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({ description: 'Last name of the user', minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  lastName: string;

  @ApiProperty({ description: 'Email address of the user', format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password for the user account', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'Phone number of the user', maxLength: 15 })
  @IsOptional()
  @IsString()
  @Length(1, 15)
  phone?: string;

  @ApiPropertyOptional({ description: 'Date of birth in YYYY-MM-DD format', format: 'date' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Gender of the user', maxLength: 10 })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  gender?: string;

  @ApiPropertyOptional({ description: 'Address of the user' })
  @IsOptional()
  @IsString()
  address?: string;
} 