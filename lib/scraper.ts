import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Types
export interface Company {
  name: string;
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
  topSectors: { name: string; count: number }[];
  topNationalities: { name: string; count: number }[];
}

// New structures for full explorers
export interface SectorData {
  name: string;
  yearly: Record<number, number>;
  total: number;
}

export interface CountyData {
  name: string;
  yearly: Record<number, number>;
  total: number;
}

export interface NationalityData {
  name: string;
  yearly: Record<number, number>;
  total: number;
}

const DATA_ROOT = path.join(process.cwd(), 'data');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data');

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

function extractPermitCount(row: any): number {
  // 1) Issued column (nationality / county files)
  if (row['Issued'] !== undefined) {
    let val = row['Issued'];
    if (typeof val === 'string') val = parseFloat(val.replace(/,/g, ''));
    else if (typeof val !== 'number') val = parseFloat(val);
    if (!isNaN(val)) return val;
  }

  // 2) Month name columns (sector files)
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

  // 3) Permits Issued columns (company files)
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

  // 4) Simple columns
  const simpleKeys = ['permits', 'count', 'number of permits'];
  for (const sk of simpleKeys) {
    const val = row[sk];
    if (val !== undefined) {
      let num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : parseFloat(val);
      if (!isNaN(num)) return num;
    }
  }

  // 5) Grand Total
  const grandKey = Object.keys(row).find(k => k.toLowerCase() === 'grand total' || k.toLowerCase() === 'permits issued grand total');
  if (grandKey) {
    let val = row[grandKey];
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

function generateSampleData(): any {
  const companies: Company[] = [];
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
    const totalPermits = Math.floor(Math.random() * 500) + 50;
    const currentYearPermits = Math.floor(Math.random() * 100) + 10;
    const trend: 'increasing' | 'decreasing' | 'stable' = Math.random() > 0.6 ? 'increasing' : (Math.random() > 0.5 ? 'decreasing' : 'stable');
    companies.push({ name, totalPermits, currentYearPermits, trend, firstYear: 2020 + Math.floor(Math.random() * 4), lastActiveYear: 2026 });
  }
  const sectors = [{ name: 'Information Technology', total: 8450 }];
  const nationalities = [{ name: 'India', total: 12453 }];
  return { companies, sectors, nationalities, yearlyTrends: [], stats: {} };
}

export async function scrapePermitData() {
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
    console.warn('⚠️ No year folders found. Using sample data.');
    const sample = generateSampleData();
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'dashboard.json'), JSON.stringify(sample, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'companies.json'), JSON.stringify(sample.companies, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sectors.json'), JSON.stringify(sample.sectors, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'counties.json'), JSON.stringify([], null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'nationalities.json'), JSON.stringify(sample.nationalities, null, 2));
    return;
  }

  // Aggregators
  const companyMap = new Map<string, {
    name: string;
    totalPermits: number;
    yearlyPermits: Record<number, number>;
    firstYear: number;
    lastYear: number;
  }>();

  const yearlyTotals: Record<number, number> = {};
  const sectorMap = new Map<string, { yearly: Record<number, number>; total: number }>();
  const countyMap = new Map<string, { yearly: Record<number, number>; total: number }>();
  const nationalityMap = new Map<string, { yearly: Record<number, number>; total: number }>();

  for (const yearDir of yearDirs) {
    const year = parseInt(yearDir);
    const dirPath = path.join(DATA_ROOT, yearDir);
    console.log(`\n📁 Processing year ${year} from ${dirPath}`);
    const rows = readExcelFilesFromDir(dirPath);
    if (rows.length === 0) continue;

    for (const row of rows) {
      // Detect row type
      const employerName = row['Employer Name'] || row['Employer'] || row['Company Name'] || row['Company'];
      const economicSector = row['Economic Sectors'] || row['Economic Sector'] || row['Sector'] || row['Industry'];
      const nationality = row['Nationality'] || row['Country'] || row['Citizenship'];
      const county = row['County'] || row['Location'] || row['Region'];

      let permits = extractPermitCount(row);
      if (permits === 0) continue;

      // Yearly total (all rows contribute)
      yearlyTotals[year] = (yearlyTotals[year] || 0) + permits;

      // 1) Companies
      if (employerName) {
        const key = employerName.toString().trim().toLowerCase();
        if (companyMap.has(key)) {
          const existing = companyMap.get(key)!;
          existing.totalPermits += permits;
          existing.yearlyPermits[year] = (existing.yearlyPermits[year] || 0) + permits;
          existing.lastYear = Math.max(existing.lastYear, year);
          existing.firstYear = Math.min(existing.firstYear, year);
        } else {
          companyMap.set(key, {
            name: employerName.toString().trim(),
            totalPermits: permits,
            yearlyPermits: { [year]: permits },
            firstYear: year,
            lastYear: year
          });
        }
      }

      // 2) Sectors
      if (economicSector) {
        const name = economicSector.toString().trim();
        if (!sectorMap.has(name)) {
          sectorMap.set(name, { yearly: {}, total: 0 });
        }
        const sec = sectorMap.get(name)!;
        sec.yearly[year] = (sec.yearly[year] || 0) + permits;
        sec.total += permits;
      }

      // 3) Nationalities
      if (nationality) {
        const name = nationality.toString().trim();
        if (!nationalityMap.has(name)) {
          nationalityMap.set(name, { yearly: {}, total: 0 });
        }
        const nat = nationalityMap.get(name)!;
        nat.yearly[year] = (nat.yearly[year] || 0) + permits;
        nat.total += permits;
      }

      // 4) Counties
      if (county) {
        const name = county.toString().trim();
        if (!countyMap.has(name)) {
          countyMap.set(name, { yearly: {}, total: 0 });
        }
        const cnt = countyMap.get(name)!;
        cnt.yearly[year] = (cnt.yearly[year] || 0) + permits;
        cnt.total += permits;
      }
    }
  }

  if (companyMap.size === 0) {
    console.warn('⚠️ No company data found. Using sample data.');
    const sample = generateSampleData();
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'dashboard.json'), JSON.stringify(sample, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'companies.json'), JSON.stringify(sample.companies, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sectors.json'), JSON.stringify(sample.sectors, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'counties.json'), JSON.stringify([], null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'nationalities.json'), JSON.stringify(sample.nationalities, null, 2));
    return;
  }

  // Build companies array with trend
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
      totalPermits: item.totalPermits,
      currentYearPermits,
      trend,
      firstYear: item.firstYear,
      lastActiveYear: item.lastYear
    });
  }

  // Prepare output arrays
  const sectors = Array.from(sectorMap.entries()).map(([name, data]) => ({ name, yearly: data.yearly, total: data.total }));
  const counties = Array.from(countyMap.entries()).map(([name, data]) => ({ name, yearly: data.yearly, total: data.total }));
  const nationalities = Array.from(nationalityMap.entries()).map(([name, data]) => ({ name, yearly: data.yearly, total: data.total }));

  // Dashboard stats and top lists
  const yearlyTrends = Object.entries(yearlyTotals).map(([y, total]) => ({ year: parseInt(y), total })).sort((a,b) => a.year - b.year);
  const totalWorkers = yearlyTrends.reduce((s, y) => s + y.total, 0);
  const topCompanies = companies.sort((a,b) => b.currentYearPermits - a.currentYearPermits).slice(0,10);
  const topSectors = sectors.sort((a,b) => (b.yearly[currentYear] || 0) - (a.yearly[currentYear] || 0)).slice(0,6).map(s => ({ name: s.name, count: s.yearly[currentYear] || 0 }));
  const topNationalities = nationalities.sort((a,b) => (b.yearly[currentYear] || 0) - (a.yearly[currentYear] || 0)).slice(0,5).map(n => ({ name: n.name, count: n.yearly[currentYear] || 0 }));

  const dashboardData = {
    stats: {
      totalCompanies: companies.length,
      totalWorkers,
      totalCountries: Object.keys(nationalityMap).length,
      topSector: topSectors[0]?.name || 'N/A',
      topSectorCount: topSectors[0]?.count || 0,
    },
    yearlyTrends,
    topCompanies,
    topSectors,
    topNationalities,
  };

  // Write all files
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'dashboard.json'), JSON.stringify(dashboardData, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'companies.json'), JSON.stringify(companies, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sectors.json'), JSON.stringify(sectors, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'counties.json'), JSON.stringify(counties, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'nationalities.json'), JSON.stringify(nationalities, null, 2));

  console.log(`✅ Wrote ${companies.length} companies, ${sectors.length} sectors, ${counties.length} counties, ${nationalities.length} nationalities.`);
}

if (require.main === module) {
  scrapePermitData().catch(console.error);
}
