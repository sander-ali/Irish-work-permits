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

function getValueByKey(row: any, keys: string[]): any {
  for (const key of keys) {
    const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
    if (foundKey !== undefined) return row[foundKey];
  }
  return undefined;
}

// Extract permit count from a company row: first look for "Grand Total", otherwise sum monthly "Permits Issued" columns
function getCompanyPermits(row: any): number {
  // 1) Look for a "Grand Total" column
  for (const key of Object.keys(row)) {
    const lowerKey = key.trim().toLowerCase();
    if (lowerKey.includes('grand total')) {
      let val = row[key];
      if (typeof val === 'string') val = parseFloat(val.replace(/,/g, ''));
      else if (typeof val !== 'number') val = parseFloat(val);
      if (!isNaN(val)) return val;
    }
  }
  // 2) Fallback: sum monthly "Permits Issued" columns (exclude Grand Total)
  let total = 0;
  for (const key of Object.keys(row)) {
    const trimmedKey = key.trim().toLowerCase();
    if (trimmedKey.startsWith('permits issued') && !trimmedKey.includes('grand total')) {
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
    const trimmedKey = key.trim().toLowerCase();
    if (months.includes(trimmedKey)) {
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
  const sectors = [{ name: "Information Technology", count: 1295 }];
  const nationalities = [{ name: "India", count: 3728 }];
  return {
    stats: { totalCompanies: 1, totalWorkers: 368, totalCountries: 1, topSector: "IT", topSectorCount: 100 },
    yearlyTrends: [{ year: 2026, total: 12219 }],
    topCompanies: companies,
    topSectors: sectors,
    topNationalities: nationalities,
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
    const sample = generateSampleData();
    ensureOutputDir();
    writeJSON('dashboard.json', sample);
    writeJSON('companies.json', sample.topCompanies);
    writeJSON('sectors.json', sample.topSectors);
    writeJSON('counties.json', []);
    writeJSON('nationalities.json', sample.topNationalities);
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
  const sectorMap = new Map<string, { yearly: Record<number, number>; total: number }>();
  const countyMap = new Map<string, { yearly: Record<number, number>; total: number }>();
  const nationalityMap = new Map<string, { yearly: Record<number, number>; total: number }>();

  for (const yearDir of yearDirs) {
    const year = parseInt(yearDir);
    const dirPath = path.join(DATA_ROOT, yearDir);
    console.log(`\n📁 Processing year ${year} from ${dirPath}`);
    const rows = readExcelFilesFromDir(dirPath);
    if (rows.length === 0) continue;

    let yearCompanyTotal = 0;

    for (const row of rows) {
      const employerName = getValueByKey(row, ['Employer Name', 'Employer']);
      const economicSector = getValueByKey(row, ['Economic Sector', 'Sector', 'Industry']);
      const nationality = getValueByKey(row, ['Nationality', 'Country']);
      const county = getValueByKey(row, ['County', 'Location']);

      // ---- COMPANY rows (only these contribute to yearly totals) ----
      if (employerName) {
        let permits = getCompanyPermits(row);
        if (permits === 0) continue;

        yearCompanyTotal += permits;

        if (employerName.toLowerCase().includes('google')) {
          console.log(`🔍 Google Ireland in ${yearDir}: permits = ${permits}`);
        }

        const key = employerName.trim().toLowerCase();
        if (companyMap.has(key)) {
          const existing = companyMap.get(key)!;
          existing.totalPermits += permits;
          existing.yearlyPermits[year] = (existing.yearlyPermits[year] || 0) + permits;
          existing.lastYear = Math.max(existing.lastYear, year);
          existing.firstYear = Math.min(existing.firstYear, year);
        } else {
          companyMap.set(key, {
            name: employerName.trim(),
            totalPermits: permits,
            yearlyPermits: { [year]: permits },
            firstYear: year,
            lastYear: year,
          });
        }
      }

      // ---- SECTOR rows (skip summary rows) ----
      if (economicSector) {
        const sectorName = economicSector.trim();
        if (/total|grand total|no sector entered/i.test(sectorName)) continue;
        let permits = sumMonthColumns(row);
        if (permits === 0) continue;
        if (!sectorMap.has(sectorName)) sectorMap.set(sectorName, { yearly: {}, total: 0 });
        const sec = sectorMap.get(sectorName)!;
        sec.yearly[year] = (sec.yearly[year] || 0) + permits;
        sec.total += permits;
      }

      // ---- NATIONALITY rows ----
      if (nationality) {
        let issued = getValueByKey(row, ['Issued']);
        if (issued === undefined) continue;
        let permits = 0;
        if (typeof issued === 'string') permits = parseFloat(issued.replace(/,/g, ''));
        else if (typeof issued === 'number') permits = issued;
        else permits = parseFloat(issued);
        if (isNaN(permits) || permits === 0) continue;
        const name = nationality.trim();
        if (!nationalityMap.has(name)) nationalityMap.set(name, { yearly: {}, total: 0 });
        const nat = nationalityMap.get(name)!;
        nat.yearly[year] = (nat.yearly[year] || 0) + permits;
        nat.total += permits;
      }

      // ---- COUNTY rows ----
      if (county) {
        let issued = getValueByKey(row, ['Issued']);
        if (issued === undefined) continue;
        let permits = 0;
        if (typeof issued === 'string') permits = parseFloat(issued.replace(/,/g, ''));
        else if (typeof issued === 'number') permits = issued;
        else permits = parseFloat(issued);
        if (isNaN(permits) || permits === 0) continue;
        const name = county.trim();
        if (!countyMap.has(name)) countyMap.set(name, { yearly: {}, total: 0 });
        const cnt = countyMap.get(name)!;
        cnt.yearly[year] = (cnt.yearly[year] || 0) + permits;
        cnt.total += permits;
      }
    }

    yearlyTotals[year] = (yearlyTotals[year] || 0) + yearCompanyTotal;
    console.log(`   📊 Year ${year} company total = ${yearCompanyTotal}`);
  }

  if (companyMap.size === 0) {
    console.warn('⚠️ No company data found. Using sample data.');
    const sample = generateSampleData();
    ensureOutputDir();
    writeJSON('dashboard.json', sample);
    writeJSON('companies.json', sample.topCompanies);
    writeJSON('sectors.json', sample.topSectors);
    writeJSON('counties.json', []);
    writeJSON('nationalities.json', sample.topNationalities);
    return;
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
      totalPermits: item.totalPermits,
      currentYearPermits,
      trend,
      firstYear: item.firstYear,
      lastActiveYear: item.lastYear,
    });
  }

  const sectorsAllYears = Array.from(sectorMap.entries()).map(([name, data]) => ({ name, count: data.total }));
  const counties = Array.from(countyMap.entries()).map(([name, data]) => ({ name, count: data.total }));
  const nationalitiesAllYears = Array.from(nationalityMap.entries()).map(([name, data]) => ({ name, count: data.total }));

  const currentYearSectors = Array.from(sectorMap.entries())
    .map(([name, data]) => ({ name, count: data.yearly[currentYear] || 0 }))
    .filter(s => s.count > 0)
    .sort((a,b) => b.count - a.count)
    .slice(0,6);

  const currentYearNationalities = Array.from(nationalityMap.entries())
    .map(([name, data]) => ({ name, count: data.yearly[currentYear] || 0 }))
    .filter(n => n.count > 0)
    .sort((a,b) => b.count - a.count)
    .slice(0,5);

  const yearlyTrends = Object.entries(yearlyTotals)
    .map(([year, total]) => ({ year: parseInt(year), total }))
    .sort((a,b) => a.year - b.year);
  const totalWorkers = yearlyTrends.reduce((s,y) => s + y.total, 0);
  const topCompanies = companies.sort((a,b) => b.currentYearPermits - a.currentYearPermits).slice(0,10);
  const topSectors = currentYearSectors;
  const topNationalities = currentYearNationalities;

  const dashboardData: DashboardData = {
    stats: {
      totalCompanies: companies.length,
      totalWorkers,
      totalCountries: nationalityMap.size,
      topSector: topSectors[0]?.name || 'N/A',
      topSectorCount: topSectors[0]?.count || 0,
    },
    yearlyTrends,
    topCompanies,
    topSectors,
    topNationalities,
  };

  ensureOutputDir();
  writeJSON('dashboard.json', dashboardData);
  writeJSON('companies.json', companies);
  writeJSON('sectors.json', sectorsAllYears);
  writeJSON('counties.json', counties);
  writeJSON('nationalities.json', nationalitiesAllYears);

  const google = companies.find(c => c.name === 'Google Ireland');
  console.log(`\n✅ Wrote ${companies.length} companies, ${sectorsAllYears.length} sectors, ${counties.length} counties, ${nationalitiesAllYears.length} nationalities.`);
  console.log(`   🎯 Google Ireland 2026 permits = ${google?.currentYearPermits || 0}`);
  console.log(`   📊 Yearly totals: ${JSON.stringify(yearlyTrends)}`);
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
