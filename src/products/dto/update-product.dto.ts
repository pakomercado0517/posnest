import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsString } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsString({ message: 'URL de la imagen no es válida' })
  image: string;
}
