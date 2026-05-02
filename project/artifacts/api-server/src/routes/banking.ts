import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

// ─── Deterministic seeded random ────────────────────────────────────────────
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ─── Data generation ────────────────────────────────────────────────────────
const OCCUPATIONS = ["Engineer", "Doctor", "Teacher", "Manager", "Sales", "Retail", "Freelancer", "Student", "Nurse", "Accountant"];
const GENDERS = ["Male", "Female"];
const ACCOUNT_TYPES = ["Savings", "Checking", "Business", "Premium"];
const REPAYMENT_STATUSES = ["On-Time", "Late", "Defaulted"];

function generateCustomers(count = 500) {
  const customers = [];
  for (let i = 1; i <= count; i++) {
    const r = (offset: number) => seededRandom(i * 31 + offset);

    const age = Math.floor(r(1) * 45) + 20; // 20-65
    const gender = GENDERS[Math.floor(r(2) * 2)];
    const occupation = OCCUPATIONS[Math.floor(r(3) * OCCUPATIONS.length)];
    const income = Math.floor(r(4) * 120000) + 20000; // 20k-140k
    const accountBalance = Math.floor(r(5) * 80000) + 500; // 500-80500
    const accountType = ACCOUNT_TYPES[Math.floor(r(6) * ACCOUNT_TYPES.length)];
    const tenure = Math.floor(r(7) * 15) + 1; // 1-15 years
    const avgTransactionAmount = Math.floor(r(8) * 5000) + 100;
    const transactionFrequency = Math.floor(r(9) * 50) + 1;

    // Derived features
    const incomeGroup =
      income < 40000 ? "Low (<$40K)" :
      income < 70000 ? "Middle ($40K-$70K)" :
      income < 100000 ? "Upper-Mid ($70K-$100K)" :
      "High (>$100K)";

    // Engagement level based on transaction frequency and balance
    const engagementScore = (transactionFrequency / 50) * 0.5 + (accountBalance / 80500) * 0.5;
    const engagementLevel =
      engagementScore > 0.7 ? "High" :
      engagementScore > 0.4 ? "Medium" :
      "Low";

    // Loan data (~80% have a loan)
    const hasLoan = r(10) > 0.2;
    let loanAmount: number | null = null;
    let loanStatus: string | null = null;
    let repaymentStatus: string | null = null;

    if (hasLoan) {
      loanAmount = Math.floor(r(11) * 80000) + 5000;
      // Approval influenced by income and balance
      const approvalScore = (income / 140000) * 0.5 + (accountBalance / 80500) * 0.3 + r(12) * 0.2;
      loanStatus = approvalScore > 0.45 ? "Approved" : "Rejected";

      if (loanStatus === "Approved") {
        const repayRoll = r(13);
        // Higher income = lower default probability
        const defaultProb = income < 40000 ? 0.25 : income < 70000 ? 0.15 : income < 100000 ? 0.08 : 0.04;
        repaymentStatus =
          repayRoll < defaultProb ? "Defaulted" :
          repayRoll < defaultProb + 0.12 ? "Late" :
          "On-Time";
      }
    }

    // Risk score (0-100, lower = better)
    const riskFactors =
      (income < 40000 ? 25 : income < 70000 ? 15 : income < 100000 ? 5 : 0) +
      (accountBalance < 5000 ? 20 : accountBalance < 15000 ? 10 : 0) +
      (engagementLevel === "Low" ? 15 : engagementLevel === "Medium" ? 5 : 0) +
      (repaymentStatus === "Defaulted" ? 30 : repaymentStatus === "Late" ? 15 : 0) +
      Math.floor(r(14) * 20);
    const riskScore = Math.min(100, riskFactors);

    const riskCategory =
      riskScore <= 25 ? "Low Risk" :
      riskScore <= 50 ? "Moderate Risk" :
      riskScore <= 75 ? "High Risk" :
      "Very High Risk";

    customers.push({
      customerId: i,
      age,
      gender,
      income,
      occupation,
      incomeGroup,
      accountBalance,
      accountType,
      tenure,
      loanAmount,
      loanStatus,
      repaymentStatus,
      avgTransactionAmount,
      transactionFrequency,
      engagementLevel,
      riskCategory,
      riskScore,
    });
  }
  return customers;
}

// Cache the generated data
const ALL_CUSTOMERS = generateCustomers(500);

function applyFilters(
  customers: typeof ALL_CUSTOMERS,
  gender?: string | null,
  income_level?: string | null,
  loan_status?: string | null
) {
  return customers.filter((c) => {
    if (gender && gender !== "All" && c.gender !== gender) return false;
    if (income_level && income_level !== "All" && c.incomeGroup !== income_level) return false;
    if (loan_status && loan_status !== "All" && c.loanStatus !== loan_status) return false;
    return true;
  });
}

// ─── KPIs ────────────────────────────────────────────────────────────────────
router.get("/kpis", (_req: Request, res: Response) => {
  const { gender, income_level, loan_status } = _req.query as Record<string, string>;
  const filtered = applyFilters(ALL_CUSTOMERS, gender, income_level, loan_status);

  const withLoans = filtered.filter((c) => c.loanStatus !== null);
  const approved = withLoans.filter((c) => c.loanStatus === "Approved");
  const defaulted = filtered.filter((c) => c.repaymentStatus === "Defaulted");
  const avgLoan =
    approved.length > 0
      ? approved.reduce((sum, c) => sum + (c.loanAmount ?? 0), 0) / approved.length
      : 0;

  res.json({
    totalCustomers: filtered.length,
    loanApprovalRate: withLoans.length > 0 ? (approved.length / withLoans.length) * 100 : 0,
    defaultRate: approved.length > 0 ? (defaulted.length / approved.length) * 100 : 0,
    avgLoanAmount: Math.round(avgLoan),
    totalLoans: withLoans.length,
    approvedLoans: approved.length,
    defaultedLoans: defaulted.length,
  });
});

// ─── Approval by income ──────────────────────────────────────────────────────
router.get("/approval-by-income", (_req: Request, res: Response) => {
  const { gender, loan_status } = _req.query as Record<string, string>;
  const filtered = applyFilters(ALL_CUSTOMERS, gender, undefined, loan_status);

  const groups = ["Low (<$40K)", "Middle ($40K-$70K)", "Upper-Mid ($70K-$100K)", "High (>$100K)"];
  const result = groups.map((group) => {
    const inGroup = filtered.filter((c) => c.incomeGroup === group && c.loanStatus !== null);
    const approved = inGroup.filter((c) => c.loanStatus === "Approved");
    return {
      incomeGroup: group,
      approvalRate: inGroup.length > 0 ? Math.round((approved.length / inGroup.length) * 100 * 10) / 10 : 0,
      totalLoans: inGroup.length,
      approvedLoans: approved.length,
    };
  });

  res.json(result);
});

// ─── Default by age ──────────────────────────────────────────────────────────
router.get("/default-by-age", (_req: Request, res: Response) => {
  const { gender, income_level } = _req.query as Record<string, string>;
  const filtered = applyFilters(ALL_CUSTOMERS, gender, income_level, undefined);

  const ageGroups = [
    { label: "20-29", min: 20, max: 29 },
    { label: "30-39", min: 30, max: 39 },
    { label: "40-49", min: 40, max: 49 },
    { label: "50-59", min: 50, max: 59 },
    { label: "60+", min: 60, max: 100 },
  ];

  const result = ageGroups.map(({ label, min, max }) => {
    const inGroup = filtered.filter((c) => c.age >= min && c.age <= max && c.loanStatus === "Approved");
    const defaulted = inGroup.filter((c) => c.repaymentStatus === "Defaulted");
    return {
      ageGroup: label,
      defaultRate: inGroup.length > 0 ? Math.round((defaulted.length / inGroup.length) * 100 * 10) / 10 : 0,
      totalLoans: inGroup.length,
      defaultedLoans: defaulted.length,
    };
  });

  res.json(result);
});

// ─── Customer segments ───────────────────────────────────────────────────────
router.get("/customer-segments", (_req: Request, res: Response) => {
  const { gender, income_level } = _req.query as Record<string, string>;
  const filtered = applyFilters(ALL_CUSTOMERS, gender, income_level, undefined);

  const segments = ["High", "Medium", "Low"];
  const total = filtered.length;

  const result = segments.map((seg) => {
    const count = filtered.filter((c) => c.engagementLevel === seg).length;
    return {
      segment: `${seg} Engagement`,
      count,
      percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    };
  });

  res.json(result);
});

// ─── Balance vs risk ─────────────────────────────────────────────────────────
router.get("/balance-vs-risk", (_req: Request, res: Response) => {
  const { gender, income_level, loan_status } = _req.query as Record<string, string>;
  const filtered = applyFilters(ALL_CUSTOMERS, gender, income_level, loan_status);

  // Return a sample of 200 for performance
  const sample = filtered.slice(0, 200);
  const result = sample.map((c) => ({
    customerId: c.customerId,
    accountBalance: c.accountBalance,
    riskScore: c.riskScore,
    riskCategory: c.riskCategory,
    loanStatus: c.loanStatus ?? "No Loan",
    incomeGroup: c.incomeGroup,
  }));

  res.json(result);
});

// ─── Risk distribution ───────────────────────────────────────────────────────
router.get("/risk-distribution", (_req: Request, res: Response) => {
  const { gender, income_level } = _req.query as Record<string, string>;
  const filtered = applyFilters(ALL_CUSTOMERS, gender, income_level, undefined);

  const categories = ["Low Risk", "Moderate Risk", "High Risk", "Very High Risk"];
  const total = filtered.length;

  const result = categories.map((cat) => {
    const inCat = filtered.filter((c) => c.riskCategory === cat);
    const avgLoan =
      inCat.filter((c) => c.loanAmount).length > 0
        ? inCat.filter((c) => c.loanAmount).reduce((s, c) => s + (c.loanAmount ?? 0), 0) /
          inCat.filter((c) => c.loanAmount).length
        : 0;
    return {
      riskCategory: cat,
      count: inCat.length,
      percentage: total > 0 ? Math.round((inCat.length / total) * 1000) / 10 : 0,
      avgLoanAmount: Math.round(avgLoan),
    };
  });

  res.json(result);
});

// ─── Transaction volume ──────────────────────────────────────────────────────
router.get("/transaction-volume", (_req: Request, res: Response) => {
  const { gender, income_level } = _req.query as Record<string, string>;
  const filtered = applyFilters(ALL_CUSTOMERS, gender, income_level, undefined);

  const segments = ["High Engagement", "Medium Engagement", "Low Engagement"];
  const result = segments.map((seg) => {
    const level = seg.split(" ")[0];
    const inSeg = filtered.filter((c) => c.engagementLevel === level);
    const avgAmt =
      inSeg.length > 0 ? inSeg.reduce((s, c) => s + c.avgTransactionAmount, 0) / inSeg.length : 0;
    const avgFreq =
      inSeg.length > 0 ? inSeg.reduce((s, c) => s + c.transactionFrequency, 0) / inSeg.length : 0;
    const totalVol = inSeg.reduce((s, c) => s + c.avgTransactionAmount * c.transactionFrequency, 0);
    return {
      segment: seg,
      avgTransactionAmount: Math.round(avgAmt),
      avgFrequency: Math.round(avgFreq * 10) / 10,
      totalVolume: Math.round(totalVol),
    };
  });

  res.json(result);
});

// ─── Customers list ──────────────────────────────────────────────────────────
router.get("/customers", (_req: Request, res: Response) => {
  const { gender, income_level, loan_status, page, limit } = _req.query as Record<string, string>;
  const filtered = applyFilters(ALL_CUSTOMERS, gender, income_level, loan_status);

  const pageNum = Math.max(1, parseInt(page ?? "1", 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit ?? "20", 10)));
  const total = filtered.length;
  const totalPages = Math.ceil(total / limitNum);
  const start = (pageNum - 1) * limitNum;
  const customers = filtered.slice(start, start + limitNum);

  res.json({
    customers,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
  });
});

export default router;
