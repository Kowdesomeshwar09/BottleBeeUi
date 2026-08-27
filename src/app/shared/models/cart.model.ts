import { VendorSummary } from './catalog.model';

/** One line in the cart, as the API serializes it. */
export interface CartItem {
  id: number;
  productVariantId: number;
  productId?: number;
  productName?: string;
  productType?: string;
  variantLabel: string | null;
  sku?: string;
  sizeMl?: number | null;
  packSize?: number | null;
  quantity: number;
  unitPrice: number;
  mrp: number | null;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  availableQuantity: number | null;
  inStock: boolean;
  /** False once a product is delisted or its vendor suspended. */
  isPurchasable: boolean;
}

export interface CartCoupon {
  id: number;
  code: string;
  title: string;
  discountType: string;
  discountValue: number;
}

export interface Cart {
  id: number;
  customerId: number;
  vendorId: number | null;
  status: string;
  vendor: VendorSummary | null;
  coupon: CartCoupon | null;
  /** Set when a previously applied coupon stopped qualifying. */
  couponError: string | null;
  items: CartItem[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  deliveryFee: number;
  grandTotal: number;
  freeDeliveryThreshold: number;
  amountToFreeDelivery: number;
  /** Everything that would block checkout, phrased for the customer. */
  warnings: string[];
  updatedAt: string;
}

export interface AvailableCoupon {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  discountType: string;
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  validUntil?: string | null;
  estimatedDiscount?: number;
}
