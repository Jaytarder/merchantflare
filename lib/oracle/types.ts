import type { EvidenceFreshness } from "../evidence";

export const oracleLifecycleStates = [
  "NEWNESS", "GROWTH", "STABLE", "PROMO_SPIKE", "SEASONAL",
  "MOVIE_RELEASE", "POST_EVENT_DECAY", "DECLINING", "END_OF_LIFE",
] as const;
export type OracleLifecycleState = (typeof oracleLifecycleStates)[number];

export const planningEvidenceClassifications = [
  "OBSERVATION", "PLANNER_ASSUMPTION", "PLANNER_RULE", "PLANNER_OVERRIDE",
  "RECOMMENDATION", "OUTCOME",
] as const;
export type PlanningEvidenceClassification = (typeof planningEvidenceClassifications)[number];

export type OracleProductRef = {
  asin?: string;
  sku: string;
  marketplace?: string;
  category?: string;
  license?: string;
  productGroup?: string;
  launchDate?: string;
  firstSaleDate?: string;
};

export type PlanningEvidence = {
  id: string;
  organizationId: string;
  decisionCaseId: string;
  sourceMessageId: string;
  sender: string;
  receivedAt: string;
  subject: string;
  product: OracleProductRef;
  metricName?: string;
  metricValue?: number;
  unit?: string;
  periodStart?: string;
  periodEnd?: string;
  classification: PlanningEvidenceClassification;
  statedRule?: string;
  statedException?: string;
  statedReasoning?: string;
  recommendedAction?: string;
  sourceConfidence: number;
  provenance: Record<string, unknown>;
};

export type OracleSignalMetric =
  | "sales_units" | "order_units" | "latest_week_sales" | "yoy_sales"
  | "wow_sales" | "aur" | "sell_through" | "ordered_revenue"
  | "shipped_revenue" | "shipped_units" | "promo_quantity"
  | "cancellations" | "amazon_oh" | "amazon_oo" | "awc_oh"
  | "df_inventory" | "transferable_inventory" | "committed_inventory"
  | "promo_commitments" | "inbound_inventory" | "lead_time_days"
  | "category_trend" | "price_change" | "advertising_change"
  | "buy_box_status" | "suppression_status" | "availability";

export type OracleDemandSignal = {
  id: string;
  organizationId: string;
  decisionCaseId: string;
  product: OracleProductRef;
  metric: OracleSignalMetric;
  value: number;
  unit: string;
  periodStart: string;
  periodEnd: string;
  observedAt: string;
  source: string;
  sourceEvidenceId?: string;
  freshness: EvidenceFreshness;
  confidence: number;
  lifecycleState?: OracleLifecycleState;
  demandCensored: boolean;
  censorReason?: string;
};

export type InventoryBuckets = {
  amazonOnHand: number;
  amazonOnOrder: number;
  awcOnHand: number;
  dfAvailable: number;
  transferable: number;
  committed: number;
  promoCommitted: number;
  inbound: number;
  protected: number;
};

export type OracleInventoryPosition = {
  product: OracleProductRef;
  asOf: string;
  buckets: InventoryBuckets;
  usableInventory: number;
  currentWos?: number;
  forwardWos?: number;
  daysOfCover?: number;
  projectedStockoutDate?: string;
  projectedExcessDate?: string;
  estimatedAvailabilityDate?: string;
  risk: "unknown" | "stockout" | "constrained" | "balanced" | "excess";
  assumptions: string[];
  missingEvidence: string[];
};

export type ForecastDriver = { name: string; impact: number; explanation: string };
export type OracleForecast = {
  model: "MichaelModel" | "OracleModel" | "NaiveBaseline";
  modelVersion: string;
  product: OracleProductRef;
  horizonWeeks: number;
  baseForecast: number;
  lowerBound: number;
  upperBound: number;
  weeklyRate: number;
  confidence: number;
  assumptions: string[];
  missingEvidence: string[];
  drivers: ForecastDriver[];
  calculatedAt: string;
};

export type MichaelModelConfig = {
  orderNoiseCeilingMultiplier: number;
  promoBackupRate: number;
  licKidsProductGroups: string[];
  minimumBuy: number;
  possibleProductionMoq: number;
  dfAwcMinimum: number;
  dfAmazonWosMaximum: number;
  dfLatestSalesMinimum: number;
  btrAmazonWosMaximum: number;
  lifecycleModifiers: Record<OracleLifecycleState, number>;
};

export type ReplenishmentAction =
  | "BUY" | "DO_NOT_BUY" | "BUY_SMALLER" | "BUY_LARGER" | "DF" | "BTR"
  | "TRANSFER_INVENTORY" | "WAIT_FOR_MORE_EVIDENCE" | "REDUCE_BUY"
  | "INCREASE_BUY" | "EXPEDITE" | "AIR_SHIP" | "DEFER" | "HUMAN_REVIEW";

export type OracleReplenishmentOption = {
  action: ReplenishmentAction;
  quantity: number;
  expectedWos?: number;
  expectedStockoutProbability: number;
  expectedExcessInventory: number;
  expectedServiceLevel: number;
  leadTimeDays?: number;
  moqImpact: string;
  cost?: { amount: number; currency: string };
  risk: "low" | "medium" | "high" | "critical";
  reversibility: "easy" | "moderate" | "difficult" | "irreversible";
  confidence: number;
  why: string[];
  whatCouldMakeItWrong: string[];
};

export type OracleForecastComparison = {
  michael: OracleForecast;
  oracle: OracleForecast;
  naive?: OracleForecast;
  absoluteDifference: number;
  percentageDifference?: number;
  materiallyDisagrees: boolean;
  disagreementDrivers: string[];
  valueOfInformation: {
    recommendation: "ACT" | "WAIT" | "GATHER_EVIDENCE" | "HUMAN_REVIEW";
    score: number;
    rationale: string;
    nextEvidence: string[];
  };
};

export type PlannerOverride = {
  plannerId: string;
  reason: string;
  quantity: number;
  recordedAt: string;
  product: OracleProductRef;
  forecastBefore: number;
  forecastAfter: number;
  expectedOutcome: string;
};

export type OraclePlanningOutcome = {
  forecastDemand: number;
  actualDemand: number;
  recommendedBuy: number;
  actualBuy: number;
  expectedStockout: boolean;
  actualStockout: boolean;
  expectedWos: number;
  actualWos: number;
  expectedExcess: number;
  actualExcess: number;
};

export type OracleOutcomeScore = {
  absoluteError: number;
  absolutePercentageError?: number;
  bias: number;
  stockoutMiss: boolean;
  overbuy: number;
  underbuy: number;
  wosError: number;
};

export type OraclePlanningCase = {
  id: string;
  organizationId: string;
  decisionCaseId: string;
  product: OracleProductRef;
  status: "draft" | "review" | "approved" | "executed" | "measuring" | "closed";
  lifecycleState: OracleLifecycleState;
  coverageHorizonDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type OracleAssessment = {
  organizationId: string;
  status: "available" | "partial" | "unavailable";
  assessedAt: string;
  decisions: Array<{
    product: OracleProductRef;
    inventory: OracleInventoryPosition;
    comparison: OracleForecastComparison;
    recommendedOption: OracleReplenishmentOption;
    alternatives: OracleReplenishmentOption[];
  }>;
  evidenceCount: number;
  limitations: string[];
};
