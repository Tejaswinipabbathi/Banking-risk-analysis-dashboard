import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

interface ApplicantInput {
  age: number;
  annualIncome: number;
  accountBalance: number;
  requestedLoanAmount: number;
  accountTenureYears: number;
  avgMonthlyTransactions: number;
  avgTransactionAmount: number;
}

interface ScoringFactor {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  detail: string;
  score: number;
}

// ─── Scoring engine ──────────────────────────────────────────────────────────
function scoreApplicant(input: ApplicantInput) {
  const {
    age,
    annualIncome,
    accountBalance,
    requestedLoanAmount,
    accountTenureYears,
    avgMonthlyTransactions,
    avgTransactionAmount,
  } = input;

  const factors: ScoringFactor[] = [];
  let totalRisk = 0;

  // ── Factor 1: Income level (0–25 pts) ───────────────────────────────────
  const incomeGroup =
    annualIncome < 40000 ? "Low (<$40K)" :
    annualIncome < 70000 ? "Middle ($40K-$70K)" :
    annualIncome < 100000 ? "Upper-Mid ($70K-$100K)" :
    "High (>$100K)";

  const incomeScore =
    annualIncome < 40000 ? 25 :
    annualIncome < 70000 ? 15 :
    annualIncome < 100000 ? 5 : 0;

  totalRisk += incomeScore;
  factors.push({
    factor: "Annual Income",
    impact: incomeScore <= 5 ? "positive" : incomeScore <= 15 ? "neutral" : "negative",
    detail: incomeScore === 0
      ? `Income $${annualIncome.toLocaleString()} places applicant in high earner bracket — lowest default risk tier`
      : incomeScore <= 5
      ? `Income $${annualIncome.toLocaleString()} (Upper-Mid) — strong repayment capacity`
      : incomeScore <= 15
      ? `Income $${annualIncome.toLocaleString()} (Middle) — moderate repayment capacity; verify debt obligations`
      : `Income $${annualIncome.toLocaleString()} (Low) — historically 204% above-average default rate in this bracket`,
    score: incomeScore,
  });

  // ── Factor 2: Loan-to-Income ratio (0–25 pts) ────────────────────────────
  const lti = requestedLoanAmount / (annualIncome || 1);
  const ltiScore =
    lti <= 0.5 ? 0 :
    lti <= 1.0 ? 8 :
    lti <= 2.0 ? 16 :
    lti <= 3.0 ? 22 : 25;

  totalRisk += ltiScore;
  factors.push({
    factor: "Loan-to-Income Ratio",
    impact: ltiScore <= 8 ? "positive" : ltiScore <= 16 ? "neutral" : "negative",
    detail: ltiScore === 0
      ? `LTI ratio ${lti.toFixed(2)}x — well within safe threshold (≤0.5x); minimal repayment strain`
      : ltiScore <= 8
      ? `LTI ratio ${lti.toFixed(2)}x — acceptable; loan is manageable relative to income`
      : ltiScore <= 16
      ? `LTI ratio ${lti.toFixed(2)}x — elevated; monthly repayments will be a significant income share`
      : `LTI ratio ${lti.toFixed(2)}x — high; loan amount disproportionate to income; default risk substantially elevated`,
    score: ltiScore,
  });

  // ── Factor 3: Account balance (0–20 pts) ─────────────────────────────────
  const balanceScore =
    accountBalance >= 30000 ? 0 :
    accountBalance >= 15000 ? 5 :
    accountBalance >= 5000 ? 12 : 20;

  totalRisk += balanceScore;
  factors.push({
    factor: "Account Balance",
    impact: balanceScore <= 5 ? "positive" : balanceScore <= 12 ? "neutral" : "negative",
    detail: balanceScore === 0
      ? `Balance $${accountBalance.toLocaleString()} — strong liquidity buffer; low financial stress risk`
      : balanceScore <= 5
      ? `Balance $${accountBalance.toLocaleString()} — adequate buffer; some financial resilience`
      : balanceScore <= 12
      ? `Balance $${accountBalance.toLocaleString()} — limited buffer; vulnerability to income disruption`
      : `Balance $${accountBalance.toLocaleString()} — insufficient reserves; high correlation with default in portfolio data`,
    score: balanceScore,
  });

  // ── Factor 4: Account tenure (0–10 pts) ──────────────────────────────────
  const tenureScore =
    accountTenureYears >= 10 ? 0 :
    accountTenureYears >= 5 ? 3 :
    accountTenureYears >= 2 ? 7 : 10;

  totalRisk += tenureScore;
  factors.push({
    factor: "Account Tenure",
    impact: tenureScore <= 3 ? "positive" : tenureScore <= 7 ? "neutral" : "negative",
    detail: tenureScore === 0
      ? `${accountTenureYears}-year banking relationship — long-standing customer; strong credit history signal`
      : tenureScore <= 3
      ? `${accountTenureYears}-year banking relationship — established customer`
      : tenureScore <= 7
      ? `${accountTenureYears}-year banking relationship — limited history; less behavioral data available`
      : `${accountTenureYears}-year banking relationship — very new customer; insufficient behavioral track record`,
    score: tenureScore,
  });

  // ── Factor 5: Age bracket risk (0–10 pts) ────────────────────────────────
  const ageBracket =
    age < 30 ? "20-29" :
    age < 40 ? "30-39" :
    age < 50 ? "40-49" :
    age < 60 ? "50-59" : "60+";

  const ageScore =
    ageBracket === "50-59" ? 0 :    // lowest default rate: 1.9%
    ageBracket === "40-49" ? 3 :    // 5.0%
    ageBracket === "20-29" ? 4 :    // 4.5%
    ageBracket === "60+" ? 6 :      // 5.9%
    10;                              // 30-39: highest 6.6% — +40% above avg

  totalRisk += ageScore;
  const ageDefaultRates: Record<string, string> = {
    "20-29": "4.5%", "30-39": "6.6%", "40-49": "5.0%", "50-59": "1.9%", "60+": "5.9%",
  };
  factors.push({
    factor: "Age Bracket",
    impact: ageScore <= 3 ? "positive" : ageScore <= 6 ? "neutral" : "negative",
    detail: ageScore === 0
      ? `Age ${age} (50–59 bracket) — lowest portfolio default rate at 1.9%; most reliable repayment cohort`
      : ageScore <= 4
      ? `Age ${age} (${ageBracket} bracket) — portfolio default rate ${ageDefaultRates[ageBracket]} for this cohort`
      : ageScore <= 6
      ? `Age ${age} (${ageBracket} bracket) — slightly elevated default history (${ageDefaultRates[ageBracket]}); verify income stability`
      : `Age ${age} (30–39 bracket) — highest portfolio default rate at 6.6%; 40% above average; lifestyle expenditure risk`,
    score: ageScore,
  });

  // ── Factor 6: Engagement level (0–10 pts) ────────────────────────────────
  const engagementScore =
    avgMonthlyTransactions >= 30 ? 0 :
    avgMonthlyTransactions >= 15 ? 3 :
    avgMonthlyTransactions >= 7 ? 7 : 10;

  const engagementLevel =
    engagementScore === 0 ? "High" :
    engagementScore <= 3 ? "High" :
    engagementScore <= 7 ? "Medium" : "Low";

  totalRisk += engagementScore;
  factors.push({
    factor: "Engagement Level",
    impact: engagementScore <= 3 ? "positive" : engagementScore <= 7 ? "neutral" : "negative",
    detail: engagementScore === 0 || engagementScore === 3
      ? `${avgMonthlyTransactions} transactions/month (High engagement) — active banking behaviour signals financial discipline`
      : engagementScore <= 7
      ? `${avgMonthlyTransactions} transactions/month (Medium engagement) — moderate activity; monitor for declining trend`
      : `${avgMonthlyTransactions} transactions/month (Low engagement) — low activity correlates with financial stress and higher default risk`,
    score: engagementScore,
  });

  // ── Totals ────────────────────────────────────────────────────────────────
  const riskScore = Math.min(100, totalRisk);

  const riskCategory =
    riskScore <= 25 ? "Low Risk" :
    riskScore <= 50 ? "Moderate Risk" :
    riskScore <= 72 ? "High Risk" :
    "Very High Risk";

  const recommendation =
    riskScore <= 50 ? "Approve" :
    riskScore <= 65 ? "Review" :
    "Reject";

  // Approval probability: inverse sigmoid-like mapping
  const approvalProbability = Math.max(2, Math.min(98,
    riskScore <= 25 ? 92 - riskScore * 0.4 :
    riskScore <= 50 ? 80 - (riskScore - 25) * 1.6 :
    riskScore <= 70 ? 40 - (riskScore - 50) * 1.4 :
    10 - (riskScore - 70) * 0.3
  ));

  // Estimated default probability: roughly income + lti + balance driven
  const estimatedDefaultProbability = Math.max(0.5, Math.min(40,
    (incomeScore / 25) * 15 +
    (ltiScore / 25) * 12 +
    (balanceScore / 20) * 8 +
    (ageScore / 10) * 4 +
    0.5
  ));

  // Max recommended loan: 2× income for low risk, scaling down
  const loanMultiplier =
    riskScore <= 25 ? 2.0 :
    riskScore <= 40 ? 1.5 :
    riskScore <= 55 ? 1.0 :
    0.5;
  const maxRecommendedLoanAmount = Math.round(annualIncome * loanMultiplier);

  // Sort factors by absolute score impact descending
  factors.sort((a, b) => b.score - a.score);

  return {
    riskScore: Math.round(riskScore * 10) / 10,
    riskCategory,
    recommendation,
    approvalProbability: Math.round(approvalProbability * 10) / 10,
    estimatedDefaultProbability: Math.round(estimatedDefaultProbability * 10) / 10,
    maxRecommendedLoanAmount,
    loanToIncomeRatio: Math.round(lti * 100) / 100,
    keyFactors: factors,
    incomeGroup,
    engagementLevel,
  };
}

// ─── Route ───────────────────────────────────────────────────────────────────
router.post("/score-applicant", (req: Request, res: Response): void => {
  const {
    age, annualIncome, accountBalance, requestedLoanAmount,
    accountTenureYears, avgMonthlyTransactions, avgTransactionAmount,
  } = req.body as Partial<ApplicantInput>;

  if (
    typeof age !== "number" ||
    typeof annualIncome !== "number" ||
    typeof accountBalance !== "number" ||
    typeof requestedLoanAmount !== "number" ||
    typeof accountTenureYears !== "number" ||
    typeof avgMonthlyTransactions !== "number" ||
    typeof avgTransactionAmount !== "number"
  ) {
    res.status(400).json({ error: "All fields are required and must be numbers" });
    return;
  }

  if (age < 18 || age > 100) { res.status(400).json({ error: "Age must be between 18 and 100" }); return; }
  if (annualIncome <= 0) { res.status(400).json({ error: "Annual income must be positive" }); return; }
  if (accountBalance < 0) { res.status(400).json({ error: "Account balance cannot be negative" }); return; }
  if (requestedLoanAmount <= 0) { res.status(400).json({ error: "Loan amount must be positive" }); return; }
  if (accountTenureYears < 0) { res.status(400).json({ error: "Tenure cannot be negative" }); return; }

  const result = scoreApplicant({
    age, annualIncome, accountBalance, requestedLoanAmount,
    accountTenureYears, avgMonthlyTransactions, avgTransactionAmount,
  });

  res.json(result);
});

export default router;
