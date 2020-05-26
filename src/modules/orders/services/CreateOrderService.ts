import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

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

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const productsIds = products.map(p => ({ id: p.id }));

    const productsData = await this.productsRepository.findAllById(productsIds);

    if (productsIds.length !== productsData.length) {
      throw new AppError('There are one or many invalid products');
    }

    const productOrderData = productsData.map(pd => {
      const getProductData = products.find(p => p.id === pd.id);

      return {
        product_id: pd.id,
        price: pd.price,
        quantity: getProductData?.quantity || 0,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productOrderData,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
