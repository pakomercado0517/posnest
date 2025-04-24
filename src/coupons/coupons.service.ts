import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { Repository } from 'typeorm';
import { endOfDay, isAfter } from 'date-fns';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
  ) {}

  create(createCouponDto: CreateCouponDto) {
    return this.couponRepository.save(createCouponDto);
  }

  findAll() {
    return this.couponRepository.find();
  }

  async findOne(id: number) {
    const coupon = await this.couponRepository.findOneBy({ id });
    if (!coupon) {
      throw new NotFoundException('El cupón no existe');
    }
    return coupon;
  }

  async update(id: number, updateCouponDto: UpdateCouponDto) {
    const coupon = await this.findOne(id);
    Object.assign(coupon, updateCouponDto);

    await this.couponRepository.save(coupon);
    return 'Cupón actualizado correctamente';
  }

  async remove(id: number) {
    const coupon = await this.findOne(id);

    await this.couponRepository.delete(coupon);
    return 'Cupón eliminado correctamente';
  }

  async applyCoupon(name: string) {
    const coupon = await this.couponRepository.findOneBy({ name });

    if (!coupon) {
      throw new NotFoundException('El cupón no existe');
    }

    const currentDate = new Date();
    const expirationDate = endOfDay(coupon.expirationDate);

    if (isAfter(currentDate, expirationDate)) {
      throw new UnprocessableEntityException('Cupón expirado');
    }

    return {
      message: 'Cupón aplicado correctamente',
      ...coupon,
    };
  }
}
