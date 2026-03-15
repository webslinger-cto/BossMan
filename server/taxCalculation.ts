// Tax calculation utilities for payroll
// Based on 2024 tax rates

// Federal tax brackets for 2024 (single filer - weekly pay periods)
const FEDERAL_TAX_BRACKETS_SINGLE = [
  { min: 0, max: 221, rate: 0.10 },
  { min: 221, max: 753, rate: 0.12 },
  { min: 753, max: 1777, rate: 0.22 },
  { min: 1777, max: 3492, rate: 0.24 },
  { min: 3492, max: 4399, rate: 0.32 },
  { min: 4399, max: 10785, rate: 0.35 },
  { min: 10785, max: Infinity, rate: 0.37 },
];

const FEDERAL_TAX_BRACKETS_MARRIED = [
  { min: 0, max: 442, rate: 0.10 },
  { min: 442, max: 1506, rate: 0.12 },
  { min: 1506, max: 3554, rate: 0.22 },
  { min: 3554, max: 6983, rate: 0.24 },
  { min: 6983, max: 8792, rate: 0.32 },
  { min: 8792, max: 13317, rate: 0.35 },
  { min: 13317, max: Infinity, rate: 0.37 },
];

// Social Security and Medicare rates (2024)
const SOCIAL_SECURITY_RATE = 0.062; // 6.2% employee portion
const MEDICARE_RATE = 0.0145; // 1.45% employee portion
const SOCIAL_SECURITY_WAGE_BASE = 168600; // 2024 limit

// Self-employment tax rate for 1099 contractors
const SELF_EMPLOYMENT_TAX_RATE = 0.153; // 15.3% (12.4% SS + 2.9% Medicare)

// State tax rates (common states for Chicago-area employees)
export const STATE_TAX_RATES: Record<string, { rate: number; name: string; noTax?: boolean }> = {
  IL: { rate: 0.0495, name: "Illinois" }, // 4.95% flat rate
  IN: { rate: 0.0315, name: "Indiana" }, // 3.15% flat rate (effective 2024)
  WI: { rate: 0.0765, name: "Wisconsin" }, // Using top marginal rate for simplicity
  MI: { rate: 0.0425, name: "Michigan" }, // 4.25% flat rate
  OH: { rate: 0.04, name: "Ohio" }, // Simplified average rate
  IA: { rate: 0.06, name: "Iowa" }, // Simplified rate
  MO: { rate: 0.0495, name: "Missouri" }, // Top rate
  KY: { rate: 0.04, name: "Kentucky" }, // 4% flat rate
  TX: { rate: 0, name: "Texas", noTax: true },
  FL: { rate: 0, name: "Florida", noTax: true },
  NV: { rate: 0, name: "Nevada", noTax: true },
  WA: { rate: 0, name: "Washington", noTax: true },
  TN: { rate: 0, name: "Tennessee", noTax: true },
};

export interface TaxCalculationInput {
  grossPay: number;
  employmentType: "hourly" | "salary"; // hourly = 1099, salary = W2
  residenceState: string;
  filingStatus: "single" | "married" | "head_of_household";
  ytdGrossWages?: number; // Year-to-date gross wages for SS cap
  allowances?: number;
}

export interface TaxCalculationResult {
  federalTax: number;
  stateTax: number;
  socialSecurity: number;
  medicare: number;
  totalTax: number;
  netPay: number;
  effectiveRate: number;
  is1099: boolean;
  selfEmploymentTax?: number;
}

export function calculateTaxes(input: TaxCalculationInput): TaxCalculationResult {
  const { grossPay, employmentType, residenceState, filingStatus, ytdGrossWages = 0, allowances = 1 } = input;
  
  const is1099 = employmentType === "hourly"; // 1099 contractors are typically hourly
  
  if (is1099) {
    // 1099 contractors - company does not withhold taxes
    // Calculate estimated self-employment tax for reporting purposes
    const selfEmploymentTax = grossPay * SELF_EMPLOYMENT_TAX_RATE;
    
    return {
      federalTax: 0, // Not withheld for 1099
      stateTax: 0, // Not withheld for 1099
      socialSecurity: 0, // Not withheld for 1099
      medicare: 0, // Not withheld for 1099
      totalTax: 0,
      netPay: grossPay, // Full amount paid to contractor
      effectiveRate: 0,
      is1099: true,
      selfEmploymentTax: selfEmploymentTax, // For reporting/estimation
    };
  }
  
  // W2 employee tax calculation
  
  // Federal income tax (using bracket system)
  const brackets = filingStatus === "married" ? FEDERAL_TAX_BRACKETS_MARRIED : FEDERAL_TAX_BRACKETS_SINGLE;
  const adjustedGross = Math.max(0, grossPay - (allowances * 87.5)); // Standard allowance per week
  let federalTax = 0;
  let remainingIncome = adjustedGross;
  
  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;
    const taxableInBracket = Math.min(remainingIncome, bracket.max - bracket.min);
    federalTax += taxableInBracket * bracket.rate;
    remainingIncome -= taxableInBracket;
  }
  
  // State income tax
  const stateInfo = STATE_TAX_RATES[residenceState.toUpperCase()] || STATE_TAX_RATES["IL"];
  const stateTax = stateInfo.noTax ? 0 : grossPay * stateInfo.rate;
  
  // Social Security (with wage base cap)
  const remainingSSWages = Math.max(0, SOCIAL_SECURITY_WAGE_BASE - ytdGrossWages);
  const ssWages = Math.min(grossPay, remainingSSWages);
  const socialSecurity = ssWages * SOCIAL_SECURITY_RATE;
  
  // Medicare (no cap)
  const medicare = grossPay * MEDICARE_RATE;
  
  const totalTax = federalTax + stateTax + socialSecurity + medicare;
  const netPay = grossPay - totalTax;
  const effectiveRate = grossPay > 0 ? totalTax / grossPay : 0;
  
  return {
    federalTax: Math.round(federalTax * 100) / 100,
    stateTax: Math.round(stateTax * 100) / 100,
    socialSecurity: Math.round(socialSecurity * 100) / 100,
    medicare: Math.round(medicare * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    netPay: Math.round(netPay * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 10000) / 10000,
    is1099: false,
  };
}

// Get available states for dropdown
export function getAvailableStates(): Array<{ code: string; name: string; rate: number }> {
  return Object.entries(STATE_TAX_RATES).map(([code, info]) => ({
    code,
    name: info.name,
    rate: info.rate,
  })).sort((a, b) => a.name.localeCompare(b.name));
}
