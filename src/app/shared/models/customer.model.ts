export interface CustomerAddress {
  id: number;
  customerId: number;
  label: string | null;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  /** Resolved by the server; drives which compliance rule applies. */
  regionCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  deliveryInstructions?: string | null;
  isDefault: boolean;
  createdAt?: string;
}

export interface CustomerProfile {
  id: number;
  userId: number;
  legalFirstName?: string;
  legalLastName?: string;
  legalName?: string | null;
  dateOfBirth: string | null;
  gender?: string | null;
  ageVerified?: boolean;
  ageVerificationStatus?: string;
  marketingOptIn?: boolean;
  defaultAddressId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgeVerification {
  id: number;
  customerId: number;
  documentType: string;
  /** The number itself is never returned — it is stored only as a keyed hash. */
  documentLast4?: string | null;
  status: string;
  rejectionReason?: string | null;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  submittedAt?: string;
  createdAt?: string;
  documentFrontUrl?: string | null;
  documentBackUrl?: string | null;
  customer?: { id: number; legalName?: string | null; dateOfBirth?: string | null };
}

/** Every reason the account cannot currently buy, not just the first. */
export interface OrderEligibility {
  eligible: boolean;
  reasons: Array<{ code: string; message: string }> | string[];
  ageVerified?: boolean;
  status?: string;
  hasProfile?: boolean;
}

export interface AppNotification {
  id: number;
  userId: number;
  type: string;
  title: string;
  body?: string;
  message?: string;
  channel?: string;
  isRead: boolean;
  readAt?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}
