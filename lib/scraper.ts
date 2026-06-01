import axios from 'axios';
import * as cheerio from 'cheerio';
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

// DETE data sources
const DATA_SOURCES = [
  'https://enterprise.gov.ie/en/publications/employment-permit-statistics-2026.html',
  'https://enterprise.gov.ie/en/publications/employment-permit-statistics-2025.html',
  'https://enterprise.gov.ie/en/publications/employment-permit-statistics-2024.html',
  'https://www.gov.ie/en/department-of-enterprise-tourism-and-employment/publications/employment-permit-statistics-2023/'
];

// Cache directory
const CACHE_DIR = path.join(process.cwd(), 'public', 'data');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// Find Excel download links on DETE pages
async function findExcelLinks(url: string): Promise<string[]> {
  try {
    const { data } = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(data);
    const links: string[] = [];

    $('a[href*=".xlsx"], a[href*=".xls"]').each((_, el) => {
      let href = $(el).attr('href');
      if (href) {
        if (href.startsWith('/')) href = `https://enterprise.gov.ie${href}`;
        if (!href.startsWith('http')) href = new URL(href, url).toString();
        links.push(href);
      }
    });

    return [...new Set(links)];
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return [];
  }
}

// Download and parse Excel file
async function downloadExcel(url: string): Promise<any[]> {
  const cachePath = path.join(CACHE_DIR, `${Buffer.from(url).toString('base64')}.json`);

  // Check cache (valid for 1 day)
  if (fs.existsSync(cachePath)) {
    const stats = fs.statSync(cachePath);
    const age = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
    if (age < 1) {
      return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    }
  }

  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    const workbook = XLSX.read(response.data);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    fs.writeFileSync(cachePath, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error(`Failed to download ${url}:`, error);
    return [];
  }
}

// Main scraper function
export async function scrapePermitData(): Promise<DashboardData> {
  console.log('🔄 Starting data scrape from DETE sources...');

  let allCompanies: Company[] = [];
  let yearlyStats: PermitStats[] = [];

  for (const source of DATA_SOURCES) {
    const excelLinks = await findExcelLinks(source);
    console.log(`Found ${excelLinks.length} Excel files at ${source}`);

    for (const link of excelLinks) {
      const data = await downloadExcel(link);
      if (data.length > 0) {
        const yearMatch = source.match(/(\d{4})/);
        const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

        const companies = parseCompanyData(data, year);
        allCompanies.push(...companies);

        const stats = parsePermitStats(data, year);
        yearlyStats.push(stats);
      }
    }
  }

  // Deduplicate and aggregate companies
  const companyMap = new Map<string, Company>();
  for (const company of allCompanies) {
    const key = company.name.toLowerCase();
    if (companyMap.has(key)) {
      const existing = companyMap.get(key)!;
      existing.totalPermits += company.totalPermits;
      existing.currentYearPermits += company.currentYearPermits;
      existing.lastActiveYear = Math.max(existing.lastActiveYear, company.lastActiveYear);
      existing.firstYear = Math.min(existing.firstYear, company.firstYear);
    } else {
      companyMap.set(key, company);
    }
  }

  const uniqueCompanies = Array.from(companyMap.values());

  // Calculate dashboard stats
  const currentYear = new Date().getFullYear();
  const currentYearStats = yearlyStats.find(s => s.year === currentYear) || yearlyStats[0];

  const dashboardData: DashboardData = {
    stats: {
      totalCompanies: uniqueCompanies.length,
      totalWorkers: yearlyStats.reduce((sum, s) => sum + s.total, 0),
      totalCountries: currentYearStats?.byNationality
        ? Object.keys(currentYearStats.byNationality).length
        : 0,
      topIndustry: currentYearStats?.byIndustry
        ? Object.entries(currentYearStats.byIndustry).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
        : 'N/A',
      topIndustryCount: currentYearStats?.byIndustry
        ? Object.entries(currentYearStats.byIndustry).sort((a, b) => b[1] - a[1])[0]?.[1] || 0
        : 0,
    },
    yearlyTrends: yearlyStats.sort((a, b) => a.year - b.year),
    topCompanies: uniqueCompanies.sort((a, b) => b.currentYearPermits - a.currentYearPermits).slice(0, 10),
    topIndustries: currentYearStats?.byIndustry
      ? Object.entries(currentYearStats.byIndustry)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, count]) => ({ name, count }))
      : [],
    topNationalities: currentYearStats?.byNationality
      ? Object.entries(currentYearStats.byNationality)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))
      : [],
  };

  // Cache the dashboard data
  fs.writeFileSync(path.join(CACHE_DIR, 'dashboard.json'), JSON.stringify(dashboardData));
  fs.writeFileSync(path.join(CACHE_DIR, 'companies.json'), JSON.stringify(uniqueCompanies));

  console.log('✅ Data scrape complete');
  return dashboardData;
}

// Parse company data from Excel rows
function parseCompanyData(data: any[], year: number): Company[] {
  const companies: Company[] = [];

  for (const row of data) {
    const name = row['Company Name'] || row['Employer'] || row['Company'];
    const industry = row['Sector'] || row['Industry'] || row['NACE Code'] || 'Other';
    const permits = parseInt(row['Permits'] || row['Count'] || row['Number of Permits'] || '0');

    if (name && permits > 0) {
      companies.push({
        name,
        industry,
        totalPermits: permits,
        currentYearPermits: permits,
        trend: 'stable',
        firstYear: year,
        lastActiveYear: year,
      });
    }
  }

  return companies;
}

// Parse permit statistics from Excel
function parsePermitStats(data: any[], year: number): PermitStats {
  const stats: PermitStats = {
    year,
    total: 0,
    byNationality: {},
    byCounty: {},
    byIndustry: {},
    companies: 0,
  };

  for (const row of data) {
    const permits = parseInt(row['Permits'] || row['Count'] || '0');
    if (!permits) continue;

    stats.total += permits;

    const nationality = row['Nationality'] || row['Country'];
    if (nationality) stats.byNationality[nationality] = (stats.byNationality[nationality] || 0) + permits;

    const county = row['County'] || row['Location'];
    if (county) stats.byCounty[county] = (stats.byCounty[county] || 0) + permits;

    const industry = row['Sector'] || row['Industry'];
    if (industry) stats.byIndustry[industry] = (stats.byIndustry[industry] || 0) + permits;

    if (row['Company Name'] || row['Employer']) stats.companies++;
  }

  return stats;
}

// Auto-refresh scheduler (runs daily at 2 AM)
export function scheduleAutoRefresh() {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    console.log('🔄 Auto-refreshing data...');
    await scrapePermitData();
  }, ONE_DAY);
}
