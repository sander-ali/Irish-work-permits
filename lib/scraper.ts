import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

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
    topSector: string;
    topSectorCount: number;
  };
  yearlyTrends: { year: number; total: number }[];
  topCompanies: Company[];
  topSectors: { name: string; count: number }[];
  topNationalities: { name: string; count: number }[];
}

const DATA_ROOT = path.join(process.cwd(), 'data');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data');

function sumCompanyPermits(row: any): number {
  let total = 0;
  for (const key of Object.keys(row)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.startsWith('permits issued') && !lowerKey.includes('grand total')) {
      let val = row[key];
      if (typeof val === 'string') val = parseFloat(val.replace(/,/g, ''));
      else if (typeof val !== 'number') val = parseFloat(val);
      if (!isNaN(val)) total += val;
    }
  }
  return total;
}

function sumMonthColumns(row: any): number {
  let total = 0;
  const months = ['january', 'february', 'march', 'april', 'may', 'june',
                  'july', 'august', 'september', 'october', 'november', 'december'];
  for (const key of Object.keys(row)) {
    const lowerKey = key.toLowerCase();
    if (months.includes(lowerKey)) {
      let val = row[key];
      if (typeof val === 'string') val = parseFloat(val.replace(/,/g, ''));
      else if (typeof val !== 'number') val = parseFloat(val);
      if (!isNaN(val)) total += val;
    }
  }
  return total;
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
  const companies: Company[] = [
    { name: "Google Ireland", totalPermits: 368, currentYearPermits: 90, trend: "increasing", firstYear: 2020, lastActiveYear: 2026 },
  ];
  return {
    stats: { totalCompanies: 1, totalWorkers: 368, totalCountries: 1, topSector: "IT", topSectorCount: 100 },
    yearlyTrends: [],
    topCompanies: companies,
    topSectors: [],
    topNationalities: [],
  };
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

  console.log(`Found year folders: ${yearDirs.join(', ')}`);

  if (yearDirs.length === 0) {
    console.warn('⚠️ No year folders. Using sample data.');
    ensureOutputDir();
    writeJSON('companies.json', generateSampleData().topCompanies);
    return;
  }

  const companyMap = new Map<string, {
    name: string;
    totalPermits: number;
    yearlyPermits: Record<number, number>;
    firstYear: number;
    lastYear: number;
  }>();

  const yearlyTotals: Record<number, number> = {};
  const sectorMap = new Map();
  const countyMap = new Map();
  const nationalityMap = new Map();

  for (const yearDir of yearDirs) {
    const year = parseInt(yearDir);
    const dirPath = path.join(DATA_ROOT, yearDir);
    console.log(`\n📁 Processing year ${year} from ${dirPath}`);
    const rows = readExcelFilesFromDir(dirPath);
    if (rows.length === 0) continue;

    for (const row of rows) {
      if (row['Employer Name']) {
        let permits = sumCompanyPermits(row);
        if (permits === 0) continue;

        // DEBUG: log Google Ireland
        if (row['Employer Name'].toLowerCase().includes('google')) {
          console.log(`🔍 Found Google Ireland in ${yearDir}, permits = ${permits}`);
        }

        yearlyTotals[year] = (yearlyTotals[year] || 0) + permits;

        const key = row['Employer Name'].trim().toLowerCase();
        if (companyMap.has(key)) {
          const existing = companyMap.get(key)!;
          existing.totalPermits += permits;
          existing.yearlyPermits[year] = (existing.yearlyPermits[year] || 0) + permits;
          existing.lastYear = Math.max(existing.lastYear, year);
          existing.firstYear = Math.min(existing.firstYear, year);
        } else {
          companyMap.set(key, {
            name: row['Employer Name'].trim(),
            totalPermits: permits,
            yearlyPermits: { [year]: permits },
            firstYear: year,
            lastYear: year,
          });
        }
      }
      // other row types omitted for brevity – same as before
    }
  }

  if (companyMap.size === 0) {
    console.warn('⚠️ No company data found. Using sample data.');
    ensureOutputDir();
    writeJSON('companies.json', generateSampleData().topCompanies);
    return;
  }

  const currentYear = 2026;
  const companies: Company[] = [];
  for (const item of companyMap.values()) {
    const currentYearPermits = item.yearlyPermits[currentYear] || 0;
    companies.push({
      name: item.name,
      totalPermits: item.totalPermits,
      currentYearPermits,
      trend: 'stable',
      firstYear: item.firstYear,
      lastActiveYear: item.lastYear,
    });
  }

  ensureOutputDir();
  writeJSON('companies.json', companies);

  const google = companies.find(c => c.name === 'Google Ireland');
  console.log(`\n✅ Wrote ${companies.length} companies.`);
  console.log(`   🎯 Google Ireland 2026 permits = ${google?.currentYearPermits || 0}`);
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function writeJSON(filename: string, data: any) {
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(data, null, 2));
}

if (require.main === module) {
  scrapePermitData().catch(console.error);
}
