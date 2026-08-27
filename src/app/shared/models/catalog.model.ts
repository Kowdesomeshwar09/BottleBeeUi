/**
 * Shapes returned by the catalog endpoints.
 *
 * These mirror the API serializers rather than the database tables — the server
 * decides what a client may see, and typing against the response is what keeps a
 * template from quietly rendering `undefined` when a field is renamed.
 *
 * Optional fields are optional because the API omits them on list responses and
 * includes them on detail responses, not because they are sometimes null.
 */

export interface VendorSummary {
  id: number;
  businessName: string;
  status?: string;
  ratingAvg?: number;
  phone?: string;
  minOrderAmount?: number | null;
}

export interface CategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface BrandRef {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
}

export interface Category extends CategoryRef {
  parentId?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  children?: Category[];
  productCount?: number;
}

export interface Brand extends BrandRef {
  description?: string | null;
  originCountry?: string | null;
  isActive?: boolean;
}

export interface InventorySnapshot {
  quantityAvailable: number;
  quantityReserved: number;
  reorderLevel: number;
  inStock: boolean;
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  sizeMl: number | null;
  packSize: number | null;
  /** Human label the API composes, e.g. "750 ml" or "Pack of 6". */
  label: string | null;
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  taxPercent: number;
  currency: string;
  barcode?: string | null;
  weightGrams?: number | null;
  status: string;
  isActive: boolean;
  inventory?: InventorySnapshot;
}

export interface ProductImage {
  id: number;
  productId: number;
  imageUrl: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface Product {
  id: number;
  vendorId: number;
  categoryId: number | null;
  brandId: number | null;
  name: string;
  slug: string;
  description?: string | null;
  alcoholPercentage: number | null;
  originCountry?: string | null;
  productType: string;
  status: string;
  rejectionReason?: string | null;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  isFeatured: boolean;
  ratingAvg: number;
  ratingCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  vendor?: VendorSummary;
  category?: CategoryRef;
  brand?: BrandRef;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

/** What `catalog/filters` returns, to populate the storefront sidebar. */
export interface CatalogFilters {
  categories: CategoryRef[];
  brands: BrandRef[];
  productTypes: string[];
  priceRange: { min: number; max: number };
}

/** The answer to "do you deliver to this pincode, and what may I buy?" */
export interface Serviceability {
  serviceable: boolean;
  regionCode?: string;
  regionName?: string;
  minimumAge?: number;
  reason?: string;
  isDryDay?: boolean;
  saleWindow?: { start: string; end: string } | null;
  blockedProductTypes?: string[];
  maxOrderValue?: number | null;
  maxUnitsPerOrder?: number | null;
}
