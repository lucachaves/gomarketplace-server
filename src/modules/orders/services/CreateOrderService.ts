import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomerRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const checkCustomersExists = await this.customersRepository.findById(
      customer_id,
    );

    if (!checkCustomersExists) {
      throw new AppError('Customers does not exist');
    }
    const productsId = products.map(product => ({ id: product.id }));

    const findProducts = await this.productsRepository.findAllById(productsId);

    if (findProducts.length !== products.length) {
      throw new AppError('Product does not exist');
    }

    const newQuantityProducts: IUpdateProductsQuantityDTO[] = [];

    const orderProducts = findProducts.map(product => {
      const findProduct = products.find(
        productOrder => productOrder.id === product.id,
      );

      const orderQuantity = findProduct!.quantity;

      if (orderQuantity > product.quantity) {
        throw new AppError('Product with insufficient quantity');
      }

      newQuantityProducts.push({
        id: product.id,
        quantity: orderQuantity,
      });

      return {
        product_id: product.id,
        price: product.price,
        quantity: orderQuantity,
      };
    });

    this.productsRepository.updateQuantity(newQuantityProducts);

    const order = await this.ordersRepository.create({
      customer: checkCustomersExists,
      products: orderProducts,
    });

    return order;
  }
}

export default CreateOrderService;
