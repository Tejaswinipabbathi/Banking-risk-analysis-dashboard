import { createContext, useContext, useState } from "react";

export type Role = "viewer" | "analyst" | "manager";

export interface RolePermissions {
  canViewScorer: boolean;
  canViewCustomerTable: boolean;
  canExportCSV: boolean;
  canExportPDF: boolean;
  canViewRiskInsights: boolean;
  canRefresh: boolean;
  canFilter: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  viewer: {
    canViewScorer:        false,
    canViewCustomerTable: false,
    canExportCSV:         false,
    canExportPDF:         false,
    canViewRiskInsights:  false,
    canRefresh:           false,
    canFilter:            false,
  },
  analyst: {
    canViewScorer:        true,
    canViewCustomerTable: true,
    canExportCSV:         true,
    canExportPDF:         false,
    canViewRiskInsights:  true,
    canRefresh:           true,
    canFilter:            true,
  },
  manager: {
    canViewScorer:        true,
    canViewCustomerTable: true,
    canExportCSV:         true,
    canExportPDF:         true,
    canViewRiskInsights:  true,
    canRefresh:           true,
    canFilter:            true,
  },
};

export const ROLE_META: Record<Role, { label: string; description: string; color: string; badge: string }> = {
  viewer: {
    label: "Viewer",
    description: "Read-only access to portfolio KPIs and charts. No exports or sensitive data.",
    color: "#6b7280",
    badge: "Read Only",
  },
  analyst: {
    label: "Analyst",
    description: "Full portfolio view, loan applicant scoring, CSV exports, and customer intelligence.",
    color: "#0079F2",
    badge: "Standard",
  },
  manager: {
    label: "Manager",
    description: "Unrestricted access including PDF export, all risk insights, and complete customer data.",
    color: "#009118",
    badge: "Full Access",
  },
};

interface RoleContextValue {
  role: Role | null;
  permissions: RolePermissions | null;
  setRole: (role: Role) => void;
  clearRole: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);

  const setRole = (r: Role) => setRoleState(r);
  const clearRole = () => setRoleState(null);

  return (
    <RoleContext.Provider value={{
      role,
      permissions: role ? ROLE_PERMISSIONS[role] : null,
      setRole,
      clearRole,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
