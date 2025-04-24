import { IsNotEmpty } from 'class-validator';

export class ApplyCouponDto {
  @IsNotEmpty({ message: 'El cupón es obligatorio' })
  coupon_name: string;
}
