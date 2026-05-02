import { useState } from "react";
import { useScoreApplicant } from "@workspace/api-client-react";
import type { ApplicantInput, ScoringResult, ScoringFactor } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CSVLink } from "react-csv";
import {
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, RotateCcw, Zap,
  History, Trash2, Download, ArrowUpFromLine,
} from "lucide-react";

const CHART_COLORS = {
  blue: "#0079F2",
  green: "#009118",
  red: "#A60808",
  orange: "#f97316",
  yellow: "#b45309",
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v);
}

function formatCompact(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

interface ScoringEntry {
  id: number;
  timestamp: Date;
  input: ApplicantInput;
  result: ScoringResult;
}

function recColor(rec: string, isDark: boolean) {
  if (rec === "Approve") return { color: CHART_COLORS.green, bg: isDark ? "rgba(0,145,24,0.12)" : "rgba(0,145,24,0.06)", border: isDark ? "rgba(0,145,24,0.3)" : "rgba(0,145,24,0.2)" };
  if (rec === "Review")  return { color: CHART_COLORS.orange, bg: isDark ? "rgba(249,115,22,0.12)" : "rgba(249,115,22,0.06)", border: isDark ? "rgba(249,115,22,0.3)" : "rgba(249,115,22,0.2)" };
  return { color: CHART_COLORS.red, bg: isDark ? "rgba(166,8,8,0.12)" : "rgba(166,8,8,0.06)", border: isDark ? "rgba(166,8,8,0.3)" : "rgba(166,8,8,0.2)" };
}

function scoreColor(score: number) {
  return score <= 25 ? CHART_COLORS.green : score <= 50 ? CHART_COLORS.blue : score <= 70 ? CHART_COLORS.orange : CHART_COLORS.red;
}

function RiskGauge({ score, isDark }: { score: number; isDark: boolean }) {
  const color = scoreColor(score);
  const pct = (score / 100) * 100;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-36 h-[72px] overflow-hidden">
        <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full border-[14px]" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" }} />
        <div
          className="absolute bottom-0 left-0 w-36 h-36 rounded-full border-[14px] transition-all duration-700"
          style={{ borderColor: color, clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", transform: `rotate(${-180 + pct * 1.8}deg)`, transformOrigin: "50% 100%" }}
        />
        <div className="absolute bottom-1 left-0 right-0 flex flex-col items-center">
          <span className="text-[28px] font-bold leading-none" style={{ color }}>{Math.round(score)}</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">Risk Score</span>
        </div>
      </div>
      <div className="flex justify-between w-36 text-[10px] text-muted-foreground">
        <span>0</span><span>50</span><span>100</span>
      </div>
    </div>
  );
}

function FactorRow({ f, isDark }: { f: ScoringFactor; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const Icon = f.impact === "positive" ? TrendingUp : f.impact === "negative" ? TrendingDown : Minus;
  const color = f.impact === "positive" ? CHART_COLORS.green : f.impact === "negative" ? CHART_COLORS.red : isDark ? "#9ca3af" : "#6b7280";
  return (
    <div className="rounded-md border px-3 py-2 cursor-pointer select-none" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb" }} onClick={() => setOpen(o => !o)}>
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
        <span className="text-[13px] font-medium flex-1">{f.factor}</span>
        <span className="text-[12px] font-semibold" style={{ color }}>
          {f.impact === "positive" ? "Low impact" : f.impact === "negative" ? `+${f.score} pts` : "Neutral"}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
      {open && <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed pl-5">{f.detail}</p>}
    </div>
  );
}

interface Field { key: keyof ApplicantInput; label: string; placeholder: string; prefix?: string; suffix?: string; min: number; max: number; step: number; hint: string; }

const FIELDS: Field[] = [
  { key: "age",                   label: "Age",                    placeholder: "e.g. 35",    min: 18,   max: 100,      step: 1,    hint: "Applicant age in years" },
  { key: "annualIncome",          label: "Annual Income",          placeholder: "e.g. 75000", prefix: "$", min: 1000, max: 10000000, step: 1000, hint: "Gross annual income" },
  { key: "accountBalance",        label: "Account Balance",        placeholder: "e.g. 18000", prefix: "$", min: 0,   max: 10000000, step: 500,  hint: "Current bank account balance" },
  { key: "requestedLoanAmount",   label: "Requested Loan Amount",  placeholder: "e.g. 50000", prefix: "$", min: 1000, max: 5000000, step: 1000, hint: "Total loan amount requested" },
  { key: "accountTenureYears",    label: "Account Tenure",         placeholder: "e.g. 5",     suffix: "yrs", min: 0, max: 50,    step: 1,    hint: "Years as a bank customer" },
  { key: "avgMonthlyTransactions",label: "Monthly Transactions",   placeholder: "e.g. 20",    suffix: "/mo", min: 0, max: 500,   step: 1,    hint: "Average number of transactions per month" },
  { key: "avgTransactionAmount",  label: "Avg Transaction Amount", placeholder: "e.g. 1200",  prefix: "$", min: 0, max: 1000000, step: 100,  hint: "Average amount per transaction" },
];

const DEFAULTS: ApplicantInput = {
  age: 35, annualIncome: 75000, accountBalance: 18000,
  requestedLoanAmount: 50000, accountTenureYears: 5,
  avgMonthlyTransactions: 20, avgTransactionAmount: 1200,
};

interface LoanScorerProps { isDark: boolean; }

export default function LoanScorer({ isDark }: LoanScorerProps) {
  const [form, setForm]       = useState<ApplicantInput>(DEFAULTS);
  const [result, setResult]   = useState<ScoringResult | null>(null);
  const [history, setHistory] = useState<ScoringEntry[]>([]);
  const [nextId, setNextId]   = useState(1);
  const mutation = useScoreApplicant();

  const handleChange = (key: keyof ApplicantInput, val: string) => {
    setForm(f => ({ ...f, [key]: val === "" ? 0 : Number(val) }));
  };

  const handleScore = () => {
    mutation.mutate(
      { data: form },
      {
        onSuccess: (data) => {
          setResult(data);
          setHistory(h => [{ id: nextId, timestamp: new Date(), input: { ...form }, result: data }, ...h]);
          setNextId(n => n + 1);
        },
      }
    );
  };

  const handleReset = () => { setForm(DEFAULTS); setResult(null); mutation.reset(); };
  const handleClearHistory = () => setHistory([]);
  const handleLoadEntry = (entry: ScoringEntry) => { setForm({ ...entry.input }); setResult(entry.result); };

  const inputBg     = isDark ? "rgba(255,255,255,0.05)" : "#f9fafb";
  const inputBorder = isDark ? "rgba(255,255,255,0.12)" : "#d1d5db";
  const inputText   = isDark ? "#f3f4f6" : "#111827";

  const recCfg = result
    ? result.recommendation === "Approve"
      ? { icon: CheckCircle2, label: "Approve",       ...recColor("Approve", isDark) }
      : result.recommendation === "Review"
      ? { icon: AlertCircle,  label: "Manual Review", ...recColor("Review",  isDark) }
      : { icon: XCircle,      label: "Reject",        ...recColor("Reject",  isDark) }
    : null;

  const csvData = history.map(e => ({
    "#": e.id,
    Time: e.timestamp.toLocaleTimeString(),
    Age: e.input.age,
    "Annual Income": e.input.annualIncome,
    "Loan Amount": e.input.requestedLoanAmount,
    "Account Balance": e.input.accountBalance,
    "Tenure (yrs)": e.input.accountTenureYears,
    "Risk Score": e.result.riskScore,
    "Risk Category": e.result.riskCategory,
    Recommendation: e.result.recommendation,
    "Approval Prob %": e.result.approvalProbability.toFixed(1),
    "Default Prob %": e.result.estimatedDefaultProbability.toFixed(1),
    "Loan-to-Income": e.result.loanToIncomeRatio.toFixed(2),
    "Max Loan": e.result.maxRecommendedLoanAmount,
  }));

  const divider = isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb";
  const rowHover = isDark ? "rgba(255,255,255,0.03)" : "#f8fafc";

  return (
    <div className="space-y-4">

      {/* ── Top two-column panel ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">

        {/* Input Form */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Applicant Details</CardTitle>
              <button onClick={handleReset} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5">Enter the applicant's financial profile to generate an instant risk score and approval recommendation.</p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {FIELDS.map(f => (
                <div key={f.key}>
                  <label className="text-[12px] font-medium text-muted-foreground block mb-1">{f.label}</label>
                  <div className="relative flex items-center">
                    {f.prefix && <span className="absolute left-2.5 text-[13px] text-muted-foreground select-none">{f.prefix}</span>}
                    <input
                      type="number" min={f.min} max={f.max} step={f.step}
                      value={form[f.key] || ""} placeholder={f.placeholder}
                      onChange={e => handleChange(f.key, e.target.value)}
                      className="w-full rounded-md text-[13px] h-9 outline-none transition-colors"
                      style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: inputText, paddingLeft: f.prefix ? "1.75rem" : "0.625rem", paddingRight: f.suffix ? "2.5rem" : "0.625rem" }}
                      title={f.hint}
                    />
                    {f.suffix && <span className="absolute right-2.5 text-[12px] text-muted-foreground select-none">{f.suffix}</span>}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleScore} disabled={mutation.isPending}
              className="w-full h-10 rounded-md text-[14px] font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{ backgroundColor: CHART_COLORS.blue, color: "#fff" }}
            >
              <Zap className="w-4 h-4" />
              {mutation.isPending ? "Scoring…" : "Score Applicant"}
            </button>
            {mutation.isError && <p className="text-[12px] text-red-600 mt-2 text-center">Scoring failed. Please check your inputs and try again.</p>}
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-base">Scoring Result</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {mutation.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
                <div className="grid grid-cols-3 gap-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
                <Skeleton className="h-40 w-full" />
              </div>
            ) : result && recCfg ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start gap-6">
                  <RiskGauge score={result.riskScore} isDark={isDark} />
                  <div className="flex-1 min-w-[200px] space-y-3">
                    <div className="rounded-lg border p-3 flex items-center gap-3" style={{ backgroundColor: recCfg.bg, borderColor: recCfg.border }}>
                      <recCfg.icon className="w-6 h-6 shrink-0" style={{ color: recCfg.color }} />
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: recCfg.color }}>Recommendation</p>
                        <p className="text-[20px] font-bold leading-tight" style={{ color: recCfg.color }}>{recCfg.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-muted-foreground">Risk Category:</span>
                      <Badge variant="outline" className="font-semibold" style={{ color: recCfg.color, borderColor: recCfg.color + "55", backgroundColor: recCfg.bg }}>{result.riskCategory}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-[11px]">{result.incomeGroup}</Badge>
                      <Badge variant="outline" className="text-[11px]">{result.engagementLevel} Engagement</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Approval Probability",    value: `${result.approvalProbability.toFixed(1)}%`,         color: result.approvalProbability >= 60 ? CHART_COLORS.green : result.approvalProbability >= 35 ? CHART_COLORS.orange : CHART_COLORS.red },
                    { label: "Est. Default Probability", value: `${result.estimatedDefaultProbability.toFixed(1)}%`, color: result.estimatedDefaultProbability < 5 ? CHART_COLORS.green : result.estimatedDefaultProbability < 12 ? CHART_COLORS.orange : CHART_COLORS.red },
                    { label: "Loan-to-Income Ratio",    value: `${result.loanToIncomeRatio.toFixed(2)}x`,           color: result.loanToIncomeRatio <= 1 ? CHART_COLORS.green : result.loanToIncomeRatio <= 2 ? CHART_COLORS.orange : CHART_COLORS.red },
                    { label: "Max Recommended Loan",    value: formatCurrency(result.maxRecommendedLoanAmount),     color: CHART_COLORS.blue },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-md p-3" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc", border: `1px solid ${divider}` }}>
                      <p className="text-[11px] text-muted-foreground mb-1 leading-tight">{stat.label}</p>
                      <p className="text-[17px] font-bold leading-none" style={{ color: stat.color }}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Risk Factors</p>
                  <div className="space-y-1.5">
                    {result.keyFactors.map((f, i) => <FactorRow key={i} f={f} isDark={isDark} />)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[340px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Zap className="w-10 h-10 opacity-20" />
                <div className="text-center">
                  <p className="text-[14px] font-medium">No result yet</p>
                  <p className="text-[13px] mt-1 opacity-70">Fill in the applicant's details and click Score Applicant to generate an instant risk assessment.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Session Scoring Log ── */}
      <Card>
        <CardHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Session Scoring Log</CardTitle>
              {history.length > 0 && (
                <span
                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb", color: isDark ? "#d1d5db" : "#374151" }}
                >
                  {history.length}
                </span>
              )}
            </div>
            {history.length > 0 && (
              <div className="flex items-center gap-2">
                <CSVLink
                  data={csvData}
                  filename={`scoring-log-${new Date().toISOString().slice(0,10)}.csv`}
                  className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </CSVLink>
                <span className="text-muted-foreground opacity-30 select-none">|</span>
                <button onClick={handleClearHistory} className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              </div>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">Every applicant scored in this session is saved here for side-by-side comparison.</p>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {history.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-[13px] text-muted-foreground opacity-60">
              No applicants scored yet — results will appear here automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${divider}`, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb" }}>
                    {["#", "Time", "Age", "Income", "Loan Amt", "Balance", "Score", "Category", "Recommendation", "Approval %", "Default %", "L/I Ratio", "Max Loan", ""].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap" style={{ fontSize: "10px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry, idx) => {
                    const rc = recColor(entry.result.recommendation, isDark);
                    const recLabel = entry.result.recommendation === "Approve" ? "Approve" : entry.result.recommendation === "Review" ? "Review" : "Reject";
                    const RecIcon = entry.result.recommendation === "Approve" ? CheckCircle2 : entry.result.recommendation === "Review" ? AlertCircle : XCircle;
                    const isActive = result === entry.result;
                    return (
                      <tr
                        key={entry.id}
                        style={{
                          borderBottom: idx < history.length - 1 ? `1px solid ${divider}` : "none",
                          backgroundColor: isActive ? (isDark ? "rgba(0,121,242,0.07)" : "rgba(0,121,242,0.04)") : "transparent",
                        }}
                        className="transition-colors"
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = rowHover; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = isActive ? (isDark ? "rgba(0,121,242,0.07)" : "rgba(0,121,242,0.04)") : "transparent"; }}
                      >
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">{entry.id}</td>
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                        <td className="px-3 py-2.5">{entry.input.age}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{formatCompact(entry.input.annualIncome)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{formatCompact(entry.input.requestedLoanAmount)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{formatCompact(entry.input.accountBalance)}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-bold" style={{ color: scoreColor(entry.result.riskScore) }}>{entry.result.riskScore}</span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-[11px]" style={{ color: scoreColor(entry.result.riskScore) }}>{entry.result.riskCategory}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ color: rc.color, backgroundColor: rc.bg }}>
                            <RecIcon className="w-3 h-3" />
                            {recLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: entry.result.approvalProbability >= 60 ? CHART_COLORS.green : entry.result.approvalProbability >= 35 ? CHART_COLORS.orange : CHART_COLORS.red }}>
                          {entry.result.approvalProbability.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: entry.result.estimatedDefaultProbability < 5 ? CHART_COLORS.green : entry.result.estimatedDefaultProbability < 12 ? CHART_COLORS.orange : CHART_COLORS.red }}>
                          {entry.result.estimatedDefaultProbability.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2.5" style={{ color: entry.result.loanToIncomeRatio <= 1 ? CHART_COLORS.green : entry.result.loanToIncomeRatio <= 2 ? CHART_COLORS.orange : CHART_COLORS.red }}>
                          {entry.result.loanToIncomeRatio.toFixed(2)}x
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{formatCompact(entry.result.maxRecommendedLoanAmount)}</td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => handleLoadEntry(entry)}
                            title="Load this applicant's inputs back into the form"
                            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                          >
                            <ArrowUpFromLine className="w-3 h-3" />
                            Load
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
