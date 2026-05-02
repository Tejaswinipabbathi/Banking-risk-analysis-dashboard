import { useState } from "react";
import { type Role, ROLE_META, ROLE_PERMISSIONS, useRole } from "@/contexts/RoleContext";
import { CheckCircle2, Eye, BarChart2, ShieldCheck, ChevronRight } from "lucide-react";

const ROLE_ICONS: Record<Role, React.ReactNode> = {
  viewer:  <Eye className="w-6 h-6" />,
  analyst: <BarChart2 className="w-6 h-6" />,
  manager: <ShieldCheck className="w-6 h-6" />,
};

const ROLE_FEATURES: Record<Role, string[]> = {
  viewer: [
    "Portfolio KPIs",
    "6 interactive charts",
    "No exports",
    "No customer data",
    "No loan scoring",
  ],
  analyst: [
    "Everything in Viewer",
    "Key Risk Insights panel",
    "Loan Applicant Scorer",
    "Customer Intelligence table",
    "CSV export per chart",
    "Filters & manual refresh",
  ],
  manager: [
    "Everything in Analyst",
    "PDF / print export",
    "Full customer data",
    "Complete risk insights",
    "All controls unlocked",
  ],
};

const ROLES: Role[] = ["viewer", "analyst", "manager"];

export default function RolePicker() {
  const { setRole } = useRole();
  const [hovered, setHovered] = useState<Role | null>(null);
  const [selected, setSelected] = useState<Role | null>(null);

  const handleEnter = (role: Role) => {
    setSelected(role);
    setTimeout(() => setRole(role), 280);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)" }}
    >
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-[12px] font-semibold" style={{ backgroundColor: "rgba(0,121,242,0.08)", color: "#0079F2" }}>
            <ShieldCheck className="w-3.5 h-3.5" />
            Role-Based Access Control
          </div>
          <h1 className="text-[32px] font-bold text-gray-900 leading-tight">Banking Risk Dashboard</h1>
          <p className="text-[15px] text-gray-500 mt-2">Select your role to access the appropriate view</p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {ROLES.map(role => {
            const meta = ROLE_META[role];
            const perms = ROLE_PERMISSIONS[role];
            const isHovered = hovered === role;
            const isSelected = selected === role;

            return (
              <button
                key={role}
                onMouseEnter={() => setHovered(role)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleEnter(role)}
                disabled={selected !== null}
                className="text-left rounded-2xl border-2 p-5 transition-all duration-200 focus:outline-none disabled:opacity-60"
                style={{
                  borderColor: isSelected || isHovered ? meta.color : "#e2e8f0",
                  backgroundColor: isSelected
                    ? meta.color + "0e"
                    : isHovered
                    ? meta.color + "06"
                    : "#ffffff",
                  boxShadow: isSelected || isHovered
                    ? `0 8px 24px ${meta.color}22`
                    : "0 1px 4px rgba(0,0,0,0.06)",
                  transform: isHovered && !isSelected ? "translateY(-2px)" : "none",
                }}
              >
                {/* Icon + badge row */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: meta.color + "14", color: meta.color }}
                  >
                    {ROLE_ICONS[role]}
                  </div>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: meta.color + "14", color: meta.color }}
                  >
                    {meta.badge}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-[18px] font-bold text-gray-900 mb-1">{meta.label}</h2>
                <p className="text-[13px] text-gray-500 leading-relaxed mb-4">{meta.description}</p>

                {/* Feature list */}
                <ul className="space-y-1.5 mb-5">
                  {ROLE_FEATURES[role].map(feat => {
                    const included = !feat.startsWith("No ");
                    return (
                      <li key={feat} className="flex items-center gap-2 text-[12px]" style={{ color: included ? "#374151" : "#9ca3af" }}>
                        <CheckCircle2
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: included ? meta.color : "#d1d5db" }}
                        />
                        {feat}
                      </li>
                    );
                  })}
                </ul>

                {/* CTA */}
                <div
                  className="flex items-center justify-center gap-1.5 w-full h-9 rounded-lg text-[13px] font-semibold transition-colors"
                  style={{
                    backgroundColor: isSelected ? meta.color : isHovered ? meta.color : meta.color + "14",
                    color: isSelected || isHovered ? "#fff" : meta.color,
                  }}
                >
                  {isSelected ? "Loading…" : `Enter as ${meta.label}`}
                  {!isSelected && <ChevronRight className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Permission comparison table */}
        <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b bg-gray-50">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">Permission Comparison</p>
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500 w-1/2">Feature</th>
                {ROLES.map(r => (
                  <th key={r} className="text-center px-3 py-2.5 font-semibold" style={{ color: ROLE_META[r].color }}>{ROLE_META[r].label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["KPIs & Charts",          "canViewRiskInsights", true],
                  ["Filters & Refresh",       "canFilter",           false],
                  ["Key Risk Insights",       "canViewRiskInsights", false],
                  ["Loan Applicant Scorer",   "canViewScorer",       false],
                  ["Customer Intelligence",   "canViewCustomerTable",false],
                  ["CSV Export",              "canExportCSV",        false],
                  ["PDF Export",              "canExportPDF",        false],
                ] as [string, keyof typeof ROLE_PERMISSIONS.viewer, boolean][]
              ).map(([label, perm, always], i) => (
                <tr key={label} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-2 text-gray-700 font-medium">{label}</td>
                  {ROLES.map(r => {
                    const has = always || ROLE_PERMISSIONS[r][perm];
                    return (
                      <td key={r} className="text-center px-3 py-2">
                        {has
                          ? <CheckCircle2 className="w-4 h-4 mx-auto" style={{ color: ROLE_META[r].color }} />
                          : <span className="text-gray-300 text-lg leading-none">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-[12px] text-gray-400 mt-5">For demo purposes only — no credentials required</p>
      </div>
    </div>
  );
}
