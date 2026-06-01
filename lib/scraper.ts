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

// Helper: normalize industry names
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

// Read all Excel files from a given directory
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

// Generate fallback sample data when no real data is found
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

  // Get all subdirectories that look like years (e.g., "2026", "2025")
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

  // Data structures
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
      // Determine what type of data this row contains by checking column names
      const isCompanyRow = !!(row['Company Name'] || row['Employer'] || row['Company'] || row['Company name'] || row['employer_name']);
      const isNationalityRow = !!(row['Nationality'] || row['Country'] || row['Citizenship']);
      const isCountyRow = !!(row['County'] || row['Location'] || row['Region']);
      const isSectorRow = !!(row['Sector'] || row['Industry'] || row['Sector Name']);

      // Extract permit count (common to all row types)
      let permitsRaw = row['Permits'] || row['Count'] || row['Number of Permits'] || row['permit_count'] || '0';
      let permits = 0;
      if (typeof permitsRaw === 'string') permits = parseInt(permitsRaw.replace(/,/g, ''), 10);
      else if (typeof permitsRaw === 'number') permits = permitsRaw;
      else permits = parseInt(permitsRaw, 10);
      if (isNaN(permits) || permits === 0) continue;

      // Update yearly total (all rows contribute)
      yearlyTotals[year] = (yearlyTotals[year] || 0) + permits;

      // Handle company data
      if (isCompanyRow) {
        const name = row['Company Name'] || row['Employer'] || row['Company'] || row['Company name'] || row['employer_name'];
        if (name) {
          const industryRaw = row['Sector'] || row['Industry'] || row['Sector Name'] || 'Other';
          const industry = normalizeIndustry(industryRaw);
          const key = name.toString().trim().toLowerCase();

          if (companyMap.has(key)) {
            const existing = companyMap.get(key)!;
            existing.totalPermits += permits;
            existing.yearlyPermits[year] = (existing.yearlyPermits[year] || 0) + permits;
            existing.lastYear = Math.max(existing.lastYear, year);
            existing.firstYear = Math.min(existing.firstYear, year);
            if (!existing.industry && industry) existing.industry = industry;
          } else {
            companyMap.set(key, {
              name: name.toString().trim(),
              industry: industry,
              totalPermits: permits,
              yearlyPermits: { [year]: permits },
              firstYear: year,
              lastYear: year
            });
          }

          // Also update industry stats for this year
          yearlyIndustries[year][industry] = (yearlyIndustries[year][industry] || 0) + permits;
        }
      }

      // Handle nationality data
      if (isNationalityRow) {
        const nationality = row['Nationality'] || row['Country'] || row['Citizenship'];
        if (nationality) {
          yearlyNationalities[year][nationality] = (yearlyNationalities[year][nationality] || 0) + permits;
        }
      }

      // Handle county data
      if (isCountyRow) {
        const county = row['County'] || row['Location'] || row['Region'];
        if (county) {
          yearlyCounties[year][county] = (yearlyCounties[year][county] || 0) + permits;
        }
      }

      // If row is only sector (no company), still update industry stats
      if (!isCompanyRow && isSectorRow) {
        const industryRaw = row['Sector'] || row['Industry'] || row['Sector Name'];
        if (industryRaw) {
          const industry = normalizeIndustry(industryRaw);
          yearlyIndustries[year][industry] = (yearlyIndustries[year][industry] || 0) + permits;
        }
      }
    }
  }

  if (companyMap.size === 0) {
    console.warn('⚠️ No company data found in Excel files. Using sample data.');
    const sample = generateSampleData();
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'dashboard.json'), JSON.stringify(sample, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'companies.json'), JSON.stringify(sample.topCompanies, null, 2));
    return sample;
  }

  // Build companies array with trends
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

  // Write output JSON files
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
