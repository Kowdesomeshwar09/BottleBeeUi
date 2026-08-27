/**
 * Central registry of every API endpoint path.
 *
 * Services reference these constants rather than writing URLs inline, so a
 * route change is a one-line edit here instead of a search across the codebase,
 * and the whole API surface the frontend touches is visible in one file.
 *
 * Paths are relative; `AppSettingsService.getSettings().apiEndPoint` supplies
 * the origin and `/api/v1/` prefix.
 */
export const AppConfig = {
  constants: {
    EMAIL_REGEX: new RegExp('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'),
    // Mirrors the backend rule: 8+ chars with upper, lower, digit and symbol.
    PASSWORD_REGEX: new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$'),
    PHONE_REGEX: new RegExp('^\\+?[1-9]\\d{7,14}$'),
  },

  // --- Auth -----------------------------------------------------------------
  login: 'auth/login',
  register: 'auth/register',
  refreshToken: 'auth/refresh-token',
  logout: 'auth/logout',
  forgotPassword: 'auth/forgot-password',
  resetPassword: 'auth/reset-password',
  changePassword: 'auth/change-password',
  me: 'auth/me',
  sessions: 'auth/sessions',

  // --- Public catalog -------------------------------------------------------
  publicProductList: 'catalog/products/list',
  publicProductDetail: 'catalog/products/detail',
  catalogFilters: 'catalog/filters',
  publicStoreDetail: 'catalog/stores/detail',
  categoryList: 'categories/list',
  categoryTree: 'categories/tree',
  categoryDetail: 'categories/detail',
  brandList: 'brands/list',
  activePromotions: 'promotions/active',
  serviceability: 'compliance/serviceability',

  // --- Cart -----------------------------------------------------------------
  cartDetail: 'cart/detail',
  cartAddItem: 'cart/add-item',
  cartUpdateItem: 'cart/update-item',
  cartRemoveItem: 'cart/remove-item',
  cartClear: 'cart/clear',
  cartApplyCoupon: 'cart/apply-coupon',
  cartRemoveCoupon: 'cart/remove-coupon',
  cartValidateCheckout: 'cart/validate-checkout',
  availableCoupons: 'coupons/available',

  // --- Orders ---------------------------------------------------------------
  checkout: 'orders/checkout',
  orderList: 'orders/list',
  orderDetail: 'orders/detail',
  orderTrack: 'orders/track',
  orderStatusHistory: 'orders/status-history',
  orderUpdateStatus: 'orders/update-status',
  orderCancel: 'orders/cancel',
  orderSummary: 'orders/summary',

  // --- Payments -------------------------------------------------------------
  paymentCreateIntent: 'payments/create-intent',
  paymentConfirm: 'payments/confirm',
  paymentMarkFailed: 'payments/mark-failed',
  paymentList: 'payments/list',
  paymentDetail: 'payments/detail',
  refundRequest: 'payments/refunds/request',
  refundReview: 'payments/refunds/review',
  refundList: 'payments/refunds/list',

  // --- Customer -------------------------------------------------------------
  customerProfileSave: 'customers/profile/save',
  customerProfileDetail: 'customers/profile/detail',
  customerOrderSummary: 'customers/profile/order-summary',
  addressList: 'customers/addresses/list',
  addressCreate: 'customers/addresses/create',
  addressUpdate: 'customers/addresses/update',
  addressSetDefault: 'customers/addresses/set-default',
  addressDelete: 'customers/addresses/delete',
  addressServiceability: 'customers/addresses/check-serviceability',
  customerAdminList: 'customers/admin/list',
  customerAdminDetail: 'customers/admin/detail',

  // --- Age verification -----------------------------------------------------
  ageVerificationSubmit: 'age-verifications/submit',
  ageVerificationMyStatus: 'age-verifications/my-status',
  ageVerificationEligibility: 'age-verifications/eligibility',
  ageVerificationList: 'age-verifications/list',
  ageVerificationDetail: 'age-verifications/detail',
  ageVerificationReview: 'age-verifications/review',

  // --- Vendors --------------------------------------------------------------
  vendorApply: 'vendors/apply',
  vendorUpdate: 'vendors/update',
  vendorList: 'vendors/list',
  vendorDetail: 'vendors/detail',
  vendorMyStores: 'vendors/my-stores',
  vendorReview: 'vendors/review',
  licenseAdd: 'vendors/licenses/add',
  licenseList: 'vendors/licenses/list',
  licenseReview: 'vendors/licenses/review',
  vendorAddressSave: 'vendors/addresses/save',
  vendorAddressList: 'vendors/addresses/list',
  vendorStaffAdd: 'vendors/staff/add',
  vendorStaffList: 'vendors/staff/list',
  vendorStaffRemove: 'vendors/staff/remove',

  // --- Products (vendor side) ----------------------------------------------
  productCreate: 'products/create',
  productUpdate: 'products/update',
  productSubmitForApproval: 'products/submit-for-approval',
  productReview: 'products/review',
  productList: 'products/list',
  productDetail: 'products/detail',
  productDelete: 'products/delete',
  variantCreate: 'products/variants/create',
  variantUpdate: 'products/variants/update',
  variantDelete: 'products/variants/delete',
  productImagesAdd: 'products/images/add',
  productImageSetPrimary: 'products/images/set-primary',
  productImageDelete: 'products/images/delete',
  categoryCreate: 'categories/create',
  categoryUpdate: 'categories/update',
  categoryDelete: 'categories/delete',
  brandCreate: 'brands/create',
  brandUpdate: 'brands/update',
  brandDelete: 'brands/delete',

  // --- Inventory ------------------------------------------------------------
  inventoryList: 'inventory/list',
  inventoryDetail: 'inventory/detail',
  inventoryAdjust: 'inventory/adjust',
  inventoryBulkAdjust: 'inventory/bulk-adjust',
  inventoryTransactions: 'inventory/transactions',
  inventoryLowStock: 'inventory/low-stock',
  inventorySummary: 'inventory/summary',

  // --- Delivery -------------------------------------------------------------
  deliverySaveProfile: 'delivery/partners/save-profile',
  deliveryMyProfile: 'delivery/partners/my-profile',
  deliveryPartnerList: 'delivery/partners/list',
  deliveryPartnerReview: 'delivery/partners/review',
  deliveryAssign: 'delivery/assign',
  deliveryRespond: 'delivery/respond',
  deliveryAdvance: 'delivery/advance',
  deliveryVerifyRecipient: 'delivery/verify-recipient',
  deliveryComplete: 'delivery/complete',
  deliveryUpdateLocation: 'delivery/update-location',
  deliveryList: 'delivery/list',
  deliveryDetail: 'delivery/detail',

  // --- Reviews --------------------------------------------------------------
  reviewSubmit: 'reviews/submit',
  reviewPublicList: 'reviews/public-list',
  reviewMyReviews: 'reviews/my-reviews',
  reviewDelete: 'reviews/delete',
  reviewList: 'reviews/list',
  reviewModerate: 'reviews/moderate',

  // --- Notifications --------------------------------------------------------
  notificationList: 'notifications/list',
  notificationUnreadCount: 'notifications/unread-count',
  notificationMarkRead: 'notifications/mark-read',
  notificationMarkAllRead: 'notifications/mark-all-read',
  notificationSend: 'notifications/send',
  templateList: 'notifications/templates/list',
  templateSave: 'notifications/templates/save',
  templatePreview: 'notifications/templates/preview',
  templateDelete: 'notifications/templates/delete',

  // --- Coupons and promotions ----------------------------------------------
  couponList: 'coupons/list',
  couponDetail: 'coupons/detail',
  couponCreate: 'coupons/create',
  couponUpdate: 'coupons/update',
  couponDelete: 'coupons/delete',
  promotionList: 'promotions/list',
  promotionSave: 'promotions/save',
  promotionDelete: 'promotions/delete',

  // --- RBAC and users -------------------------------------------------------
  userList: 'users/list',
  userDetail: 'users/detail',
  userCreate: 'users/create',
  userUpdate: 'users/update',
  userChangeStatus: 'users/change-status',
  userDelete: 'users/delete',
  userResetPassword: 'users/reset-password',
  userUnlock: 'users/unlock',
  roleList: 'rbac/roles/list',
  roleDetail: 'rbac/roles/detail',
  roleCreate: 'rbac/roles/create',
  roleUpdate: 'rbac/roles/update',
  roleDelete: 'rbac/roles/delete',
  permissionList: 'rbac/permissions/list',
  permissionMatrix: 'rbac/permissions/matrix',
  roleSetPermissions: 'rbac/roles/set-permissions',
  assignRoles: 'rbac/users/assign-roles',

  // --- Compliance -----------------------------------------------------------
  complianceRuleList: 'compliance/rules/list',
  complianceRuleDetail: 'compliance/rules/detail',
  complianceRuleSave: 'compliance/rules/save',
  complianceRuleDelete: 'compliance/rules/delete',

  // --- Admin ----------------------------------------------------------------
  adminDashboard: 'admin/dashboard',
  salesReport: 'admin/reports/sales',
  complianceReport: 'admin/reports/compliance',
  auditLogs: 'admin/audit-logs',
  auditTrail: 'admin/audit-trail',

  // --- Health ---------------------------------------------------------------
  healthCheck: 'health/check',
};
