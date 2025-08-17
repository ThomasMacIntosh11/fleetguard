// lib/plans.ts
export type PlanId = 'free' | 'growth' | 'scale';

export type Plan = {
  id: PlanId;
  label: string;
  priceMonthly: number; // in CAD
  maxVehicles: number;  // 5, 25, 50 (use Infinity for enterprise if needed)
  stripePriceId?: string; // set via env or hardcode price ids
};

export const PLANS: Record<PlanId, Plan> = {
  free:   { id: 'free',   label: 'Free',    priceMonthly: 0,   maxVehicles: 5 },
  growth: { id: 'growth', label: 'Growth',  priceMonthly: 199, maxVehicles: 25, stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH },
  scale:  { id: 'scale',  label: 'Scale',   priceMonthly: 500, maxVehicles: 50, stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SCALE },
};

export const PLAN_KEY = 'fg_plan'; // localStorage key

export type StoredPlan = {
  id: PlanId;
  label: string;
  maxVehicles: number;
  customerEmail?: string;
};