import { IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio' })
  @IsString({ message: 'Nombre no válido' })
  name: string;

  @IsNotEmpty({ message: 'El precio es obligatorio' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Precio no válido' })
  price: number;

  @IsNotEmpty({ message: 'La imagen es obligatoria' })
  image: string;

  @IsNotEmpty({ message: 'La cantidad de productos es obligatoria' })
  @IsNumber({ maxDecimalPlaces: 0 }, { message: 'Cantidad no válida' })
  inventory: number;

  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  @IsInt({ message: 'La categoría no es válida' })
  categoryId: number;
}
