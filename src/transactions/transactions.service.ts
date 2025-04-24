import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Transaction,
  TransactionContents,
} from './entities/transaction.entity';
import { Between, FindManyOptions, Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { endOfDay, isValid, parseISO, startOfDay } from 'date-fns';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionContents)
    private readonly transactionContentsReposiory: Repository<TransactionContents>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly couponService: CouponsService,
  ) {}

  async create(createTransactionDto: CreateTransactionDto) {
    await this.productRepository.manager.transaction(
      async (transactionEntityManager) => {
        const transaction = new Transaction();
        const total = createTransactionDto.contents.reduce(
          (total, item) => total + item.quantity * item.price,
          0,
        );
        transaction.total = total;

        if (createTransactionDto.coupon) {
          const coupon = await this.couponService.applyCoupon(
            createTransactionDto.coupon,
          );
          const discount = (coupon.percentage / 100) * total;
          transaction.discount = discount;
          transaction.coupon = coupon.name;
          transaction.total -= discount;
        }

        for (const contents of createTransactionDto.contents) {
          const product = await transactionEntityManager.findOneBy(Product, {
            id: contents.productId,
          });

          const errors: string[] = [];

          if (!product) {
            errors.push(
              `El producto con el ID ${contents.productId} no existe`,
            );
            throw new NotFoundException(errors);
          }

          if (contents.quantity > product.inventory) {
            errors.push(
              `El producto ${product.name} no tiene suficiente inventrario`,
            );
            throw new BadRequestException(errors);
          }

          product.inventory -= contents.quantity;

          // Create TransactionContents instance
          const transactionContents = new TransactionContents();
          transactionContents.price = contents.price;
          transactionContents.product = product;
          transactionContents.quantity = contents.quantity;
          transactionContents.transaction = transaction;

          await transactionEntityManager.save(transaction);
          await transactionEntityManager.save(transactionContents);
        }
      },
    );

    return 'Venta almacenada correctamente';
  }

  findAll(transactionDate?: string) {
    const options: FindManyOptions<Transaction> = {
      relations: {
        contents: true,
      },
    };

    if (transactionDate) {
      const date = parseISO(transactionDate);
      if (!isValid(date)) {
        throw new BadRequestException('La fecha no es válida');
      }

      const start = startOfDay(date);
      const end = endOfDay(date);

      options.where = {
        transactionDate: Between(start, end),
      };
    }
    return this.transactionRepository.find(options);
  }

  async findOne(id: number) {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: { contents: true },
    });

    if (!transaction) {
      throw new NotFoundException('La venta no existe');
    }
    return transaction;
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto) {
    const transaction = await this.findOne(id);
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }
    if (updateTransactionDto.total === undefined) {
      throw new Error('Total value is required');
    }
    transaction.total = updateTransactionDto.total;
    await this.transactionRepository.save(transaction);

    if (updateTransactionDto.contents) {
      for (const contents of updateTransactionDto.contents) {
        const product = await this.productRepository.findOneBy({
          id: contents.productId,
        });
        if (!product) {
          throw new NotFoundException('El producto no existe');
        }
        await this.transactionContentsReposiory.save({
          ...contents,
          product,
          transaction,
        });
      }
    }
    return 'Venta actualizada correctamente';
  }

  async remove(id: number) {
    const transaction = await this.findOne(id);

    for (const contents of transaction.contents) {
      const product = await this.productRepository.findOneBy({
        id: contents.product.id,
      });

      if (!product) throw new NotFoundException('El producto no existe');

      product.inventory += contents.quantity;
      await this.productRepository.save(product);

      const transactionContents =
        await this.transactionContentsReposiory.findOneBy({ id: contents.id });

      if (!transactionContents)
        throw new NotFoundException('No hay contenido en esta venta');

      await this.transactionContentsReposiory.remove(transactionContents);
    }

    await this.transactionRepository.remove(transaction);
    return 'Venta eliminada correctamente';
  }
}
