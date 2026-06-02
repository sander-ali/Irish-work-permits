import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Types
export interface Company {
  name: string;
  industry: string;
  totalPermits: number;
  currentYearPermits: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  firstYear: number;
  lastActiveYear: number;
}

export interface DashboardData {
  stats: {
    totalCompanies: number;
    totalWorkers: number;
    totalCountries: number;
    topIndustry: string;
    topIndustryCount: number;
  };
  yearlyTrends: { year: number; total: number }[];
  topCompanies: Company[];
  topIndustries: { name: string; count: number }[];
  topNationalities: { name: string; count: number }[];
}

const DATA_ROOT = path.join(process.cwd(), 'data');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data');

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

function normalizeIndustry(industry: string): string {
  const mapping: Record<string, string> = {
    'ICT': 'Information Technology',
    'Information Technology': 'Information Technology',
    'Health': 'Healthcare',
    'Medical': 'Healthcare',
    'Manufacturing': 'Engineering & Manufacturing',
    'Engineering': 'Engineering & Manufacturing',
    'Construction': 'Construction & Trades',
    'Finance': 'Finance & Professional Services',
    'Professional Services': 'Finance & Professional Services',
    'Business Services': 'Business Services & Operations'
  };
  return mapping[industry] || industry || 'Other';
}

// Smart permit extraction: works for company (monthly), sector (monthly), nationality (Issued), county (Issued)
function extractPermitCount(row: any): number {
  // 1) If there is an "Issued" column (nationality / county files)
  if (row['Issued'] !== undefined) {
    let val = row['Issued'];
    if (typeof val === 'string') val = parseFloat(val.replace(/,/g, ''));
    else if (typeof val !== 'number') val = parseFloat(val);
    if (!isNaN(val)) return val;
  }

  // 2) Sum month-name columns (e.g., January, February) – for sector files and any other monthly breakdowns
  let monthTotal = 0;
  let foundMonth = false;
  for (const key of Object.keys(row)) {
    const lowerKey = key.toLowerCase().trim();
    if (MONTH_NAMES.includes(lowerKey)) {
      let val = row[key];
      if (typeof val === 'string') val = parseFloat(val.replace(/,/g, ''));
      else if (typeof val !== 'number') val = parseFloat(val);
      if (!isNaN(val)) {
        monthTotal += val;
        foundMonth = true;
      }
    }
  }
  if (foundMonth) return monthTotal;

  // 3) Sum columns starting with "Permits Issued" – for company files
  let permitsTotal = 0;
  let foundPermits = false;
  for (const key of Object.keys(row)) {
    if (key.toLowerCase().startsWith('permits issued')) {
      let val = row[key];
      if (typeof val === 'string') val = parseFloat(val.replace(/,/g, ''));
      else if (typeof val !== 'number') val = parseFloat(val);
      if (!isNaN(val)) {
        permitsTotal += val;
        foundPermits = true;
      }
    }
  }
  if (foundPermits) return permitsTotal;

  // 4) Fallback: a column named "Permits" or "Count"
  const simpleKeys = ['permits', 'count', 'number of permits'];
  for (const sk of simpleKeys) {
    const val = row[sk];
    if (val !== undefined) {
      let num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : parseFloat(val);
      if (!isNaN(num)) return num;
    }
  }

  // 5) Last resort: look for "Grand Total" column
  const grandTotalKey = Object.keys(row).find(k => 
    k.toLowerCase() === 'grand total' || k.toLowerCase() === 'permits issued grand total'
  );
  if (grandTotalKey) {
    let val = row[grandTotalKey];
    if (typeof val === 'string') val = parseFloat(val.replace(/,/g, ''));
    else if (typeof val !== 'number') val = parseFloat(val);
    if (!isNaN(val)) return val;
  }

  return 0;
}

function readExcelFilesFromDir(dirPath: string): any[] {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
  let allRows: any[] = [];
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    console.log(`   📄 Reading ${file}`);
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];
    console.log(`      ${rows.length} rows, columns: ${Object.keys(rows[0] || {}).join(', ')}`);
    allRows = allRows.concat(rows);
  }
  return allRows;
}

function generateSampleData(): DashboardData {
  const companies: Company[] = [];
  const industries = ['Information Technology', 'Healthcare', 'Engineering & Manufacturing', 'Finance & Professional Services', 'Business Services & Operations', 'Construction & Trades'];
  const companyNames = [
    'Google Ireland', 'Apple Distribution', 'Microsoft Ireland', 'Amazon Data Services', 'Meta Platforms',
    'Deloitte', 'PwC', 'Ernst & Young', 'KPMG', 'Accenture',
    'Hibernia Healthcare', 'St. James Hospital', 'Mater Private', 'Irish Life Health',
    'Intel Ireland', 'Boston Scientific', 'Medtronic', 'Janssen Sciences',
    'AIB Group', 'Bank of Ireland', 'Citibank Europe', 'Goldman Sachs',
    'CRH plc', 'Kerry Group', 'Smurfit Kappa', 'Ryanair', 'Aer Lingus'
  ];
  for (let i = 0; i < companyNames.length; i++) {
    const name = companyNames[i];
    const industry = industries[i % industries.length];
    const totalPermits = Math.floor(Math.random() * 500) + 50;
    const currentYearPermits = Math.floor(Math.random() * 100) + 10;
    const trend: 'increasing' | 'decreasing' | 'stable' = Math.random() > 0.6 ? 'increasing' : (Math.random() > 0.5 ? 'decreasing' : 'stable');
    companies.push({ name, industry, totalPermits, currentYearPermits, trend, firstYear: 2020 + Math.floor(Math.random() * 4), lastActiveYear: 2026 });
  }
  return {
    stats: { totalCompanies: companies.length, totalWorkers: companies.reduce((s,c)=>s+c.totalPermits,0), totalCountries: 87, topIndustry: 'Information Technology', topIndustryCount: 8450 },
    yearlyTrends: [{ year: 2020, total: 15234 }, { year: 2021, total: 18763 }, { year: 2022, total: 23122 }, { year: 2023, total: 28901 }, { year: 2024, total: 31245 }, { year: 2025, total: 33412 }, { year: 2026, total: 3621 }],
    topCompanies: companies.sort((a,b)=>b.currentYearPermits - a.currentYearPermits).slice(0,10),
    topIndustries: [{ name: 'Information Technology', count: 8450 }, { name: 'Healthcare', count: 6230 }, { name: 'Engineering & Manufacturing', count: 5120 }, { name: 'Finance & Professional Services', count: 4780 }, { name: 'Business Services & Operations', count: 3920 }, { name: 'Construction & Trades', count: 2870 }],
    topNationalities: [{ name: 'India', count: 12453 }, { name: 'Brazil', count: 6789 }, { name: 'Philippines', count: 5432 }, { name: 'China', count: 4321 }, { name: 'United States', count: 3987 }]
  };
}

export async function scrapePermitData(): Promise<DashboardData> {
  console.log('📂 Scanning year folders in', DATA_ROOT);

  if (!fs.existsSync(DATA_ROOT)) {
    console.warn(`⚠️ Directory ${DATA_ROOT} does not exist. Creating it.`);
    fs.mkdirSync(DATA_ROOT, { recursive: true });
  }

  const yearDirs = fs.readdirSync(DATA_ROOT).filter(item => {
    const fullPath = path.join(DATA_ROOT, item);
    return fs.statSync(fullPath).isDirectory() && /^\d{4}$/.test(item);
  });

  if (yearDirs.length === 0) {
    console.warn('⚠️ No year folders (e.g., data/2026/) found. Using sample data.');
    const sample = generateSampleData();
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'dashboard.json'), JSON.stringify(sample, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'companies.json'), JSON.stringify(sample.topCompanies, null, 2));
    return sample;
  }

  const companyMap = new Map<string, {
    name: string;
    industry: string;
    totalPermits: number;
    yearlyPermits: Record<number, number>;
    firstYear: number;
    lastYear: number;
  }>();

  const yearlyTotals: Record<number, number> = {};
  const yearlyIndustries: Record<number, Record<string, number>> = {};
  const yearlyNationalities: Record<number, Record<string, number>> = {};
  const yearlyCounties: Record<number, Record<string, number>> = {};

  for (const yearDir of yearDirs) {
    const year = parseInt(yearDir);
    const dirPath = path.join(DATA_ROOT, yearDir);
    console.log(`\n📁 Processing year ${year} from ${dirPath}`);
    const rows = readExcelFilesFromDir(dirPath);
    if (rows.length === 0) continue;

    if (!yearlyTotals[year]) yearlyTotals[year] = 0;
    if (!yearlyIndustries[year]) yearlyIndustries[year] = {};
    if (!yearlyNationalities[year]) yearlyNationalities[year] = {};
    if (!yearlyCounties[year]) yearlyCounties[year] = {};

    for (const row of rows) {
      // Detect row type by key columns
      const employerName = row['Employer Name'] || row['Employer'] || row['Company Name'] || row['Company'];
      const economicSector = row['Economic Sectors'] || row['Economic Sector'] || row['Sector'] || row['Industry'];
      const nationality = row['Nationality'] || row['Country'] || row['Citizenship'];
      const county = row['County'] || row['Location'] || row['Region'];

      // Get permit count using unified extraction
      let permits = extractPermitCount(row);
      if (permits === 0) continue;

      // Update yearly total (every row contributes)
      yearlyTotals[year] = (yearlyTotals[year] || 0) + permits;

      // 1) Company rows
      if (employerName) {
        const industryRaw = row['Sector'] || row['Industry'] || row['Sector Name'] || 'Other';
        const industry = normalizeIndustry(industryRaw);
        const key = employerName.toString().trim().toLowerCase();

        if (companyMap.has(key)) {
          const existing = companyMap.get(key)!;
          existing.totalPermits += permits;
          existing.yearlyPermits[year] = (existing.yearlyPermits[year] || 0) + permits;
          existing.lastYear = Math.max(existing.lastYear, year);
          existing.firstYear = Math.min(existing.firstYear, year);
          if (!existing.industry && industry) existing.industry = industry;
        } else {
          companyMap.set(key, {
            name: employerName.toString().trim(),
            industry: industry,
            totalPermits: permits,
            yearlyPermits: { [year]: permits },
            firstYear: year,
            lastYear: year
          });
        }

        yearlyIndustries[year][industry] = (yearlyIndustries[year][industry] || 0) + permits;
      }
      // 2) Sector rows (no employer, but has economic sector)
      else if (economicSector) {
        const industry = normalizeIndustry(economicSector);
        yearlyIndustries[year][industry] = (yearlyIndustries[year][industry] || 0) + permits;
      }

      // 3) Nationality rows
      if (nationality) {
        yearlyNationalities[year][nationality] = (yearlyNationalities[year][nationality] || 0) + permits;
      }

      // 4) County rows
      if (county) {
        yearlyCounties[year][county] = (yearlyCounties[year][county] || 0) + permits;
      }
    }
  }

  if (companyMap.size === 0) {
    console.warn('⚠️ No company data found. Using sample data.');
    const sample = generateSampleData();
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'dashboard.json'), JSON.stringify(sample, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'companies.json'), JSON.stringify(sample.topCompanies, null, 2));
    return sample;
  }

  const currentYear = 2026;
  const companies: Company[] = [];
  for (const item of companyMap.values()) {
    const currentYearPermits = item.yearlyPermits[currentYear] || 0;
    const prevYearPermits = item.yearlyPermits[currentYear - 1] || 0;
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (currentYearPermits > prevYearPermits * 1.1) trend = 'increasing';
    else if (currentYearPermits < prevYearPermits * 0.9) trend = 'decreasing';
    else trend = 'stable';

    companies.push({
      name: item.name,
      industry: item.industry || 'Other',
      totalPermits: item.totalPermits,
      currentYearPermits,
      trend,
      firstYear: item.firstYear,
      lastActiveYear: item.lastYear
    });
  }

  const topCompanies = [...companies].sort((a,b) => b.currentYearPermits - a.currentYearPermits).slice(0,10);
  const yearlyTrends = Object.entries(yearlyTotals)
    .map(([year, total]) => ({ year: parseInt(year), total }))
    .sort((a,b) => a.year - b.year);

  let topIndustries: { name: string; count: number }[] = [];
  if (yearlyIndustries[currentYear]) {
    topIndustries = Object.entries(yearlyIndustries[currentYear])
      .sort((a,b) => b[1] - a[1])
      .slice(0,6)
      .map(([name, count]) => ({ name, count }));
  } else {
    topIndustries = [{ name: 'Information Technology', count: 8450 }];
  }

  let topNationalities: { name: string; count: number }[] = [];
  if (yearlyNationalities[currentYear]) {
    topNationalities = Object.entries(yearlyNationalities[currentYear])
      .sort((a,b) => b[1] - a[1])
      .slice(0,5)
      .map(([name, count]) => ({ name, count }));
  }

  const totalWorkers = yearlyTrends.reduce((sum, y) => sum + y.total, 0);
  let topIndustry = 'N/A', topIndustryCount = 0;
  if (yearlyIndustries[currentYear]) {
    const top = Object.entries(yearlyIndustries[currentYear]).sort((a,b) => b[1] - a[1])[0];
    if (top) {
      topIndustry = top[0];
      topIndustryCount = top[1];
    }
  }

  const dashboardData: DashboardData = {
    stats: {
      totalCompanies: companies.length,
      totalWorkers,
      totalCountries: Object.keys(yearlyNationalities[currentYear] || {}).length,
      topIndustry,
      topIndustryCount
    },
    yearlyTrends,
    topCompanies,
    topIndustries,
    topNationalities
  };

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'dashboard.json'), JSON.stringify(dashboardData, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'companies.json'), JSON.stringify(companies, null, 2));

  console.log(`\n✅ Wrote ${companies.length} companies to public/data/`);
  console.log(`   Total workers across all years: ${totalWorkers}`);
  return dashboardData;
}

if (require.main === module) {
  scrapePermitData().catch(console.error);
}
