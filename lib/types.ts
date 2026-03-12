/**
 * Shared types for customer and risk assessment domain.
 * Single source of truth - import from here to avoid duplicates.
 */

export type CustomerStatus = "Active" | "At Risk" | "Inactive";

export type StatusFilter = CustomerStatus | null;

export type SortColumn =
  | "companyName"
  | "country"
  | "merchantSegment"
  | "volume90d"
  | "transactionCount90d"
  | "daysSinceLastTransaction"
  | "status";

export type ClassificationInput = {
  daysSinceLastTransaction: number | null;
  transactionCount90d: number;
  volume30d: number;
  volumePrior30d: number;
  avgMonthlyVolumeEur: number | null;
  merchantSegment: string | null;
};

export type MerchantMetrics = {
  volume90d: number;
  transactionCount90d: number;
  lastTransactionTimestamp: Date | null;
  volume30d: number;
  volumePrior30d: number;
  avgMonthlyVolumeEur: number | null;
};

export type CustomerOverview = {
  merchantId: number;
  companyName: string | null;
  country: string | null;
  merchantSegment: string | null;
  volume90d: number;
  transactionCount90d: number;
  daysSinceLastTransaction: number | null;
  status: CustomerStatus;
  risk_reason: string;
  /** Raw metrics for client-side reclassification with custom thresholds */
  volume30d?: number;
  volumePrior30d?: number;
  avgMonthlyVolumeEur?: number | null;
};

export type StatusOverTimeWeek = {
  week: string;
  weekLabel: string;
  active: number;
  atRisk: number;
  inactive: number;
  total: number;
};

export type CustomerDetailResponse = {
  customer: {
    merchantId: number;
    companyName: string | null;
    contactPerson: string | null;
    phoneNumber: string | null;
    address: string | null;
    country: string | null;
    productType: string | null;
    merchantSegment: string | null;
    merchantCreatedAt: Date | null;
    volume90d: number;
    transactionCount90d: number;
    daysSinceLastTransaction: number | null;
    status: CustomerStatus;
    risk_reason: string;
  };
  transactions: Array<{
    transactionId: string | null;
    transactionTimestamp: Date | null;
    transactionAmountEur: number;
    currency: string | null;
    cardType: string | null;
  }>;
  monthlyVolume: Array<{
    month: Date;
    volume: number;
    transactionCount: number;
  }>;
  retentionCalls: Array<{
    id: number;
    customerId: number;
    callTimestamp: Date;
    outcome: string | null;
    notes: string | null;
  }>;
};

/**
 * API response shape as received by the client (dates serialized as ISO strings).
 */
export type CustomerDetailResponseFromApi = {
  customer: {
    merchantId: number;
    companyName: string | null;
    contactPerson: string | null;
    phoneNumber: string | null;
    address: string | null;
    country: string | null;
    productType: string | null;
    merchantSegment: string | null;
    merchantCreatedAt: string | null;
    volume90d: number;
    transactionCount90d: number;
    daysSinceLastTransaction: number | null;
    status: CustomerStatus;
    risk_reason: string;
  };
  transactions: Array<{
    transactionId: string | null;
    transactionTimestamp: string | null;
    transactionAmountEur: number;
    currency: string | null;
    cardType: string | null;
  }>;
  monthlyVolume: Array<{
    month: string;
    volume: number;
    transactionCount: number;
  }>;
  retentionCalls: Array<{
    id: number;
    customerId: number;
    callTimestamp: string;
    outcome: string | null;
    notes: string | null;
  }>;
};

/** Derived types from CustomerDetailResponseFromApi for convenience */
export type Customer = CustomerDetailResponseFromApi["customer"];
export type Transaction = CustomerDetailResponseFromApi["transactions"][number];
export type MonthlyVolume = CustomerDetailResponseFromApi["monthlyVolume"][number];
export type RetentionCall = CustomerDetailResponseFromApi["retentionCalls"][number];
