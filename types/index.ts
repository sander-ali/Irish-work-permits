export interface Company {
  name: string;
  industry: string;
  totalPermits: number;
  currentYearPermits: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  firstYear: number;
  lastActiveYear: number;
}

export interface PermitStats {
  year: number;
  total: number;
  byNationality: Record<string, number>;
  byCounty: Record<string, number>;
  byIndustry: Record<string, number>;
  companies: number;
}

export interface DashboardData {
  stats: {
    totalCompanies: number;
    totalWorkers: number;
    totalCountries: number;
    topIndustry: string;
    topIndustryCount: number;
  };
  yearlyTrends: PermitStats[];
  topCompanies: Company[];
  topIndustries: { name: string; count: number }[];
  topNationalities: { name: string; count: number }[];
}
