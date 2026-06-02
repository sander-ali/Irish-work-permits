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
  const sectors = [{ name: 'Information Technology', count: 8450 }];
  const nationalities = [{ name: 'India', count: 12453 }];
  return {
    stats: { totalCompanies: companies.length, totalWorkers: companies.reduce((s,c)=>s+c.totalPermits,0), totalCountries: 87, topSector: 'Information Technology', topSectorCount: 8450 },
    yearlyTrends: [{ year: 2020, total: 15234 }, { year: 2021, total: 18763 }, { year: 2022, total: 23122 }, { year: 2023, total: 28901 }, { year: 2024, total: 31245 }, { year: 2025, total: 33412 }, { year: 2026, total: 3621 }],
    topCompanies: companies.slice(0,10),
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

  if (yearDirs.length === 0) {
    console.warn('⚠️ No year folders. Using sample data.');
    const sample = generateSampleData();
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUTPUT_DIR, 'dashboard.json'), JSON.stringify(sample, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'companies.json'), JSON.stringify(sample.topCompanies, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sectors.json'), JSON.stringify(sample.topSectors, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'counties.json'), JSON.stringify([], null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'nationalities.json'), JSON.stringify(sample.topNationalities, null, 2));
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

    for (const row of rows) {
      // ---- COMPANY ----
      if (row['Employer Name']) {
        let permits = 0;
        // Sum all columns that start with "Permits Issued" but exclude "Grand Total"
        for (const key of Object.keys(row)) {
          const lowerKey = key.toLowerCase();
          if (lowerKey.startsWith('permits issued') && !lowerKey.includes('grand total')) {
            let val = row[key];
            if (typeof val === 'string') val = parseFloat(val.replace(/,/g, ''));
            else if (typeof val !== 'number') val = parseFloat(val);
            if (!isNaN(val)) permits += val;
          }
        }
        if (permits === 0) continue;

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

        // Special debug for Google Ireland
        if (row['Employer Name'].toLowerCase().includes('google')) {
          console.log(`🔍 Google Ireland in ${year}: found permits = ${permits}`);
        }
      }

      // ---- SECTOR ----
      else if (row['Economic Sector']) {
        let sectorPermits = 0;
        for (const key of Object.keys(row)) {
          const lowerKey = key.toLowerCase();
          if (lowerKey === 'grand total') continue;
          if (['january', 'february', 'march', 'april', 'may', 'june',
               'july', 'august', 'september', 'october', 'november', 'december'].includes(lowerKey)) {
            let val = row[key];
            if (typeof val === 'string') val = parseFloat(val.replace(/,/g, ''));
            else if (typeof val !== 'number') val = parseFloat(val);
            if (!isNaN(val)) sectorPermits += val;
          }
        }
        if (sectorPermits === 0) continue;

        yearlyTotals[year] = (yearlyTotals[year] || 0) + sectorPermits;

        const name = row['Economic Sector'].trim();
        if (!sectorMap.has(name)) sectorMap.set(name, { yearly: {}, total: 0 });
        const sec = sectorMap.get(name)!;
        sec.yearly[year] = (sec.yearly[year] || 0) + sectorPermits;
        sec.total += sectorPermits;
      }

      // ---- NATIONALITY ----
      else if (row['Nationality'] && row['Issued'] !== undefined) {
        let issued = row['Issued'];
        let permits = 0;
        if (typeof issued === 'string') permits = parseFloat(issued.replace(/,/g, ''));
        else if (typeof issued === 'number') permits = issued;
        else permits = parseFloat(issued);
        if (isNaN(permits) || permits === 0) continue;

        yearlyTotals[year] = (yearlyTotals[year] || 0) + permits;

        const name = row['Nationality'].trim();
        if (!nationalityMap.has(name)) nationalityMap.set(name, { yearly: {}, total: 0 });
        const nat = nationalityMap.get(name)!;
        nat.yearly[year] = (nat.yearly[year] || 0) + permits;
        nat.total += permits;
      }

      // ---- COUNTY ----
      else if (row['County'] && row['Issued'] !== undefined) {
        let issued = row['Issued'];
        let permits = 0;
        if (typeof issued === 'string') permits = parseFloat(issued.replace(/,/g, ''));
        else if (typeof issued === 'number') permits = issued;
        else permits = parseFloat(issued);
        if (isNaN(permits) || permits === 0) continue;

        yearlyTotals[year] = (yearlyTotals[year] || 0) + permits;

        const name = row['County'].trim();
        if (!countyMap.has(name)) countyMap.set(name, { yearly: {}, total: 0 });
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
    fs.writeFileSync(path.join(OUTPUT_DIR, 'companies.json'), JSON.stringify(sample.topCompanies, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sectors.json'), JSON.stringify(sample.topSectors, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'counties.json'), JSON.stringify([], null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'nationalities.json'), JSON.stringify(sample.topNationalities, null, 2));
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

  const sectors = Array.from(sectorMap.entries()).map(([name, data]) => ({ name, count: data.total }));
  const counties = Array.from(countyMap.entries()).map(([name, data]) => ({ name, count: data.total }));
  const nationalities = Array.from(nationalityMap.entries()).map(([name, data]) => ({ name, count: data.total }));

  const yearlyTrends = Object.entries(yearlyTotals)
    .map(([year, total]) => ({ year: parseInt(year), total }))
    .sort((a,b) => a.year - b.year);
  const totalWorkers = yearlyTrends.reduce((s,y) => s + y.total, 0);
  const topCompanies = companies.sort((a,b) => b.currentYearPermits - a.currentYearPermits).slice(0,10);
  const topSectors = sectors.sort((a,b) => b.count - a.count).slice(0,6);
  const topNationalities = nationalities.sort((a,b) => b.count - a.count).slice(0,5);

  const dashboardData: DashboardData = {
    stats: {
      totalCompanies: companies.length,
      totalWorkers,
      totalCountries: nationalities.length,
      topSector: topSectors[0]?.name || 'N/A',
      topSectorCount: topSectors[0]?.count || 0,
    },
    yearlyTrends,
    topCompanies,
    topSectors,
    topNationalities,
  };

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'dashboard.json'), JSON.stringify(dashboardData, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'companies.json'), JSON.stringify(companies, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sectors.json'), JSON.stringify(sectors, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'counties.json'), JSON.stringify(counties, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, 'nationalities.json'), JSON.stringify(nationalities, null, 2));

  const googleCompany = companies.find(c => c.name === 'Google Ireland');
  console.log(`\n✅ Wrote ${companies.length} companies, ${sectors.length} sectors, ${counties.length} counties, ${nationalities.length} nationalities.`);
  console.log(`   🎯 Google Ireland 2026 permits = ${googleCompany?.currentYearPermits || 0}`);
}

if (require.main === module) {
  scrapePermitData().catch(console.error);
}
