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

const DATA_SOURCES = [
  'https://enterprise.gov.ie/en/publications/employment-permit-statistics-2026.html',
  'https://enterprise.gov.ie/en/publications/employment-permit-statistics-2025.html',
  'https://enterprise.gov.ie/en/publications/employment-permit-statistics-2024.html',
  'https://www.gov.ie/en/department-of-enterprise-tourism-and-employment/publications/employment-permit-statistics-2023/'
];

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

async function downloadExcel(url: string): Promise<any[]> {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    const workbook = XLSX.read(response.data);
    const sheetName = workbook.SheetNames[0];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  } catch (error) {
    console.error(`Failed to download ${url}:`, error);
    return [];
  }
}

function parseCompanyData(data: any[], year: number): Company[] {
  const companiesMap = new Map<string, Company>();

  for (const row of data) {
    const name = row['Company Name'] || row['Employer'] || row['Company'];
    const industry = row['Sector'] || row['Industry'] || 'Other';
    const permits = parseInt(row['Permits'] || row['Count'] || row['Number of Permits'] || '0');

    if (!name || permits === 0) continue;

    const key = name.toLowerCase();
    if (companiesMap.has(key)) {
      const existing = companiesMap.get(key)!;
      existing.totalPermits += permits;
      if (year === new Date().getFullYear()) {
        existing.currentYearPermits += permits;
      }
      existing.lastActiveYear = Math.max(existing.lastActiveYear, year);
      existing.firstYear = Math.min(existing.firstYear, year);
    } else {
      companiesMap.set(key, {
        name,
        industry,
        totalPermits: permits,
        currentYearPermits: year === new Date().getFullYear() ? permits : 0,
        trend: 'stable',
        firstYear: year,
        lastActiveYear: year,
      });
    }
  }

  return Array.from(companiesMap.values());
}

function parsePermitStats(data: any[], year: number): PermitStats {
  const stats: PermitStats = {
    year,
    total: 0,
    byNationality: {},
    byCounty: {},
    byIndustry: {},
    companies: 0,
  };

  const seenCompanies = new Set<string>();

  for (const row of data) {
    const permits = parseInt(row['Permits'] || row['Count'] || '0');
    if (!permits) continue;

    stats.total += permits;

    const nationality = row['Nationality'] || row['Country'];
    if (nationality) {
      stats.byNationality[nationality] = (stats.byNationality[nationality] || 0) + permits;
    }

    const county = row['County'] || row['Location'];
    if (county) {
      stats.byCounty[county] = (stats.byCounty[county] || 0) + permits;
    }

    const industry = row['Sector'] || row['Industry'];
    if (industry) {
      stats.byIndustry[industry] = (stats.byIndustry[industry] || 0) + permits;
    }

    const companyName = row['Company Name'] || row['Employer'];
    if (companyName && !seenCompanies.has(companyName)) {
      seenCompanies.add(companyName);
      stats.companies++;
    }
  }

  return stats;
}

export async function scrapePermitData(): Promise<DashboardData> {
  console.log('🔄 Starting data scrape from DETE sources...');

  let allCompanies: Company[] = [];
  const yearlyStatsMap = new Map<number, PermitStats>();

  for (const source of DATA_SOURCES) {
    const excelLinks = await findExcelLinks(source);
    console.log(`Found ${excelLinks.length} Excel files at ${source}`);

    const yearMatch = source.match(/(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    for (const link of excelLinks) {
      const data = await downloadExcel(link);
      if (data.length === 0) continue;

      const companies = parseCompanyData(data, year);
      allCompanies.push(...companies);

      const stats = parsePermitStats(data, year);
      if (yearlyStatsMap.has(year)) {
        const existing = yearlyStatsMap.get(year)!;
        existing.total += stats.total;
        Object.entries(stats.byNationality).forEach(([k, v]) => {
          existing.byNationality[k] = (existing.byNationality[k] || 0) + v;
        });
        Object.entries(stats.byIndustry).forEach(([k, v]) => {
          existing.byIndustry[k] = (existing.byIndustry[k] || 0) + v;
        });
        existing.companies += stats.companies;
      } else {
        yearlyStatsMap.set(year, stats);
      }
    }
  }

  // Merge duplicate companies
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
      companyMap.set(key, { ...company });
    }
  }

  const uniqueCompanies = Array.from(companyMap.values());

  // Compute trends
  const currentYear = new Date().getFullYear();
  for (const company of uniqueCompanies) {
    const yearsActive = company.lastActiveYear - company.firstYear + 1;
    const avgPermits = company.totalPermits / yearsActive;
    if (company.currentYearPermits > avgPermits * 1.1) company.trend = 'increasing';
    else if (company.currentYearPermits < avgPermits * 0.9) company.trend = 'decreasing';
    else company.trend = 'stable';
  }

  const yearlyTrends = Array.from(yearlyStatsMap.values()).sort((a, b) => a.year - b.year);
  const currentYearStats = yearlyStatsMap.get(currentYear);

  const dashboardData: DashboardData = {
    stats: {
      totalCompanies: uniqueCompanies.length,
      totalWorkers: yearlyTrends.reduce((sum, y) => sum + y.total, 0),
      totalCountries: currentYearStats ? Object.keys(currentYearStats.byNationality).length : 0,
      topIndustry: currentYearStats
        ? Object.entries(currentYearStats.byIndustry).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
        : 'N/A',
      topIndustryCount: currentYearStats
        ? Object.entries(currentYearStats.byIndustry).sort((a, b) => b[1] - a[1])[0]?.[1] || 0
        : 0,
    },
    yearlyTrends,
    topCompanies: uniqueCompanies.sort((a, b) => b.currentYearPermits - a.currentYearPermits).slice(0, 10),
    topIndustries: currentYearStats
      ? Object.entries(currentYearStats.byIndustry)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, count]) => ({ name, count }))
      : [],
    topNationalities: currentYearStats
      ? Object.entries(currentYearStats.byNationality)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))
      : [],
  };

  // Write static JSON files to public/data/
  const dataDir = path.join(process.cwd(), 'public', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const dashboardPath = path.join(dataDir, 'dashboard.json');
  const companiesPath = path.join(dataDir, 'companies.json');

  fs.writeFileSync(dashboardPath, JSON.stringify(dashboardData, null, 2));
  fs.writeFileSync(companiesPath, JSON.stringify(uniqueCompanies, null, 2));

  console.log(`✅ Data saved to public/data/ (${uniqueCompanies.length} companies)`);
  return dashboardData;
}

// If run directly (node scraper.ts), execute the scrape
if (require.main === module) {
  scrapePermitData().catch(console.error);
}
