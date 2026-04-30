import { z } from "zod";

export const CSRCategoryEnum = z.enum(["Constant", "Spending", "Reserve"]);
export type CSRCategory = z.infer<typeof CSRCategoryEnum>;

export const CSR_CATEGORY = {
  CONSTANT: "Constant",
  SPENDING: "Spending",
  RESERVE: "Reserve",
} as const satisfies Record<string, CSRCategory>;

export const TransferLogSchema = z.object({
  id: z.string().min(1).max(64),
  timestamp: z.number().int().nonnegative(),
  amount: z.number().nonnegative(),
  status: z.enum(["Completed", "Pending", "Error"]),
  note: z.string().max(500).optional(),
});
export type TransferLog = z.infer<typeof TransferLogSchema>;

export const BudgetAllocationSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(100),
  amount: z.number().nonnegative(),
  category: CSRCategoryEnum,
  targetAccountId: z.string().max(64).optional(),
  isTransferred: z.boolean().optional(),
  transferHistory: z.array(TransferLogSchema).max(120).optional(),
});
export type BudgetAllocation = z.infer<typeof BudgetAllocationSchema>;

export const LiabilitySchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(100),
  totalAmount: z.number().nonnegative(),
  monthlyPayment: z.number().nonnegative(),
  dueDate: z.string().max(10).optional(),
  interestRate: z.number().min(0).max(100).optional(),
});
export type Liability = z.infer<typeof LiabilitySchema>;

export const TransactionSchema = z.object({
  id: z.string().min(1).max(64),
  timestamp: z.number().int().nonnegative(),
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.number().nonnegative(),
  note: z.string().max(500),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const FinancialAccountSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(100),
  amount: z.number().nonnegative(),
  purpose: z.string().max(200),
  isEmergencyFund: z.boolean(),
  type: z.enum(["Savings", "Fixed", "Investment", "Other"]),
  transactions: z.array(TransactionSchema).max(500),
});
export type FinancialAccount = z.infer<typeof FinancialAccountSchema>;

export const FinancialSnapshotSchema = z.object({
  id: z.string().min(1).max(64),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  timestamp: z.number().int().nonnegative(),
  totalWealth: z.number(),
  totalDebt: z.number().nonnegative(),
  netWorth: z.number(),
  savingsRate: z.number(),
});
export type FinancialSnapshot = z.infer<typeof FinancialSnapshotSchema>;

export const IncomeProjectionSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(100),
  monthlyAmountChange: z.number(),
  startDate: z.string().regex(/^\d{4}-\d{2}$/),
  type: z.enum(["increase", "decrease"]),
});
export type IncomeProjection = z.infer<typeof IncomeProjectionSchema>;

export const FinancialPlanSchema = z.object({
  income: z.number().nonnegative().max(100_000_000),
  savingsTarget: z.number().nonnegative().default(2_880_000),
  allocations: z.array(BudgetAllocationSchema).max(50),
  liabilities: z.array(LiabilitySchema).max(20),
  emergencyFunds: z.array(FinancialAccountSchema).max(10),
  history: z.array(FinancialSnapshotSchema).max(240).optional().default([]),
  projections: z.array(IncomeProjectionSchema).max(30).optional().default([]),
});
export type FinancialPlan = z.infer<typeof FinancialPlanSchema>;

export const PillarStatusSchema = z.object({
  name: z.string(),
  score: z.number().min(0).max(100),
  status: z.enum(["Healthy", "Warning", "Critical"]),
  insight: z.string(),
});
export type PillarStatus = z.infer<typeof PillarStatusSchema>;

export type CSRBreakdown = Record<CSRCategory, number>;
