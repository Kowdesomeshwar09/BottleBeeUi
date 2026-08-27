import { VendorSummary } from './catalog.model';

export interface OrderItem {
  id: number;
  productId: number | null;
  productVariantId: number | null;
  /** Snapshotted at checkout, so a later rename does not rewrite history. */
  productName: string;
  variantLabel: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
}

/** Frozen at checkout, so editing or deleting the address never rewrites history. */
export interface AddressSnapshot {
  recipientName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  regionCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  deliveryInstructions?: string | null;
}

export interface OrderCustomerRef {
  id: number;
  legalName: string | null;
  userId: number;
  email?: string;
  phone?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  vendorId: number;
  deliveryAddressId: number | null;
  status: string;
  paymentStatus: string;
  deliveryStatus: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  deliveryFee: number;
  grandTotal: number;
  regionCode: string;
  deliveryAddress: AddressSnapshot | null;
  customerNotes?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  confirmedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** What this order may move to next — drives the action buttons. */
  allowedNextStatuses: string[];
  items?: OrderItem[];
  vendor?: VendorSummary;
  customer?: OrderCustomerRef;
}

export interface OrderStatusEvent {
  id: number;
  orderId: number;
  fromStatus: string | null;
  toStatus: string;
  changedBy: number | null;
  changedByName?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface Delivery {
  id: number;
  orderId: number;
  orderNumber?: string;
  deliveryPartnerId: number | null;
  status: string;
  assignedAt?: string | null;
  acceptedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  failureReason?: string | null;
  recipientVerified: boolean;
  recipientVerifiedAt?: string | null;
  recipientDocumentType?: string | null;
  deliveryNotes?: string | null;
  allowedNextStatuses?: string[];
  order?: Order;
  partner?: {
    id: number;
    name?: string;
    phone?: string;
    vehicleType?: string;
    vehicleNumber?: string;
  };
}

export interface Payment {
  id: number;
  orderId: number;
  paymentReference: string;
  provider: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  paidAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
}

/** What `payments/create-intent` hands back for the checkout screen. */
export interface PaymentIntent {
  paymentId: number;
  paymentReference: string;
  provider: string;
  amount: number;
  currency: string;
  /** Provider-specific handle: a Razorpay order id, or a mock token. */
  providerOrderId?: string;
  publicKey?: string;
}
