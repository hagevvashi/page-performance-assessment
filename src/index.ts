import { google } from "googleapis";
import type { sheets_v4, pagespeedonline_v5 } from "googleapis";
import dayjs from "dayjs";

const URL_LIST_SHEET_NAME = "urls";
const { GOOGLEAPIS_AUTH_KEY } = process.env;
if (GOOGLEAPIS_AUTH_KEY === undefined) {
  throw new Error("GOOGLEAPIS_AUTH_KEY is not defined");
}

enum Column {
  Id,
  Url,
};

async function getSheet(options: sheets_v4.Params$Resource$Spreadsheets$Get): Promise<sheets_v4.Schema$Sheet[]> {
  const { data: { sheets } } = await google.sheets({ version: "v4", auth: GOOGLEAPIS_AUTH_KEY }).spreadsheets.get(options);
  if (sheets === undefined) {
    throw new Error("500: No spreadsheet data");
  }
  return sheets;
}

function getRecords(sheet: sheets_v4.Schema$Sheet): sheets_v4.Schema$RowData[] {
  if (sheet.data === undefined) {
    throw new Error("The value of includeGridData option is set to false(default value is false)");
  }
  const gridData = sheet.data[0];
  if (gridData === undefined) {
    throw new Error("Invalid data. There have to be at least one record.");
  }
  const { rowData } = gridData;
  if (rowData === undefined) {
    throw new Error("Invalid data. There have to be 'rowData'.");
  }
  return rowData.slice(1);
}

function createInsertRecord(responseJson: pagespeedonline_v5.Schema$PagespeedApiPagespeedResponseV5, url: string) {
  const now = dayjs(new Date()).format();

  const { loadingExperience, lighthouseResult } = responseJson;
  if (loadingExperience === undefined) {
    throw new Error("FIXME");
  }
  const { metrics } = loadingExperience;
  if (metrics === undefined || metrics === null) {
    throw new Error("FIXME");
  }

  if (lighthouseResult === undefined) {
    throw new Error("FIXME");
  }
  const { categories, audits } = lighthouseResult;
  if (categories === undefined || categories === null) {
    throw new Error("FIXME");
  }
  if (audits === undefined || audits === null) {
    throw new Error("FIXME");
  }

  const loadingExperienceMetricsKeys = ["CUMULATIVE_LAYOUT_SHIFT_SCORE", "FIRST_CONTENTFUL_PAINT_MS", "FIRST_INPUT_DELAY_MS", "LARGEST_CONTENTFUL_PAINT_MS"] as const;

  const loadingExperienceMetrics = loadingExperienceMetricsKeys.map((key) => {
    return metrics[key];
  });

  const lightHouseResultScores = ([
    "performance",
    "accessibility",
    "best-practices",
    "seo",
    "pwa",
  ] as const).map((key) => {
    return categories[key];
  });

  const auditsKeys = ["aria-required-attr", "final-screenshot", "legacy-javascript", "offscreen-content-hidden", "redirects-http", "js-libraries", "first-contentful-paint-3g", "is-on-https", "html-lang-valid", "duplicated-javascript", "duplicate-id-active", "no-vulnerable-libraries", "video-caption", "largest-contentful-paint-element", "pwa-page-transitions", "efficient-animated-content", "deprecations", "aria-progressbar-name", "button-name", "uses-rel-preconnect", "errors-in-console", "aria-hidden-focus", "network-requests", "aria-roles", "inspector-issues", "font-display", "doctype", "object-alt", "full-page-screenshot", "td-headers-attr", "tap-targets", "dlitem", "meta-refresh", "offscreen-images", "third-party-facades", "first-cpu-idle", "total-blocking-time", "unminified-css", "pwa-each-page-has-url", "cumulative-layout-shift", "non-composited-animations", "themed-omnibox", "th-has-data-cells", "layout-shift-elements", "aria-required-children", "managed-focus", "heading-order", "uses-responsive-images", "definition-list", "form-field-multiple-labels", "input-image-alt", "canonical", "external-anchors-use-rel-noopener", "visual-order-follows-dom", "diagnostics", "html-has-lang", "no-unload-listeners", "focusable-controls", "aria-tooltip-name", "network-rtt", "link-text", "long-tasks", "preload-fonts", "focus-traps", "hreflang", "appcache-manifest", "aria-valid-attr", "custom-controls-labels", "listitem", "pwa-cross-browser", "crawlable-anchors", "aria-meter-name", "font-size", "estimated-input-latency", "aria-command-name", "aria-treeitem-name", "uses-webp-images", "aria-required-parent", "bootup-time", "max-potential-fid", "link-name", "uses-rel-preload", "installable-manifest", "unused-javascript", "notification-on-start", "dom-size", "structured-data", "is-crawlable", "uses-text-compression", "metrics", "valid-lang", "interactive", "first-contentful-paint", "geolocation-on-start", "preload-lcp-image", "screenshot-thumbnails", "password-inputs-can-be-pasted-into", "resource-summary", "splash-screen", "color-contrast", "user-timings", "uses-long-cache-ttl", "duplicate-id-aria", "unused-css-rules", "total-byte-weight", "meta-description", "unsized-images", "timing-budget", "uses-optimized-images", "third-party-summary", "redirects", "first-meaningful-paint", "main-thread-tasks", "aria-hidden-body", "http-status-code", "aria-input-field-name", "unminified-javascript", "largest-contentful-paint", "robots-txt", "content-width", "service-worker", "accesskeys", "meta-viewport", "aria-allowed-attr", "aria-toggle-field-name", "image-size-responsive", "render-blocking-resources", "critical-request-chains", "uses-passive-event-listeners", "charset", "logical-tab-order", "maskable-icon", "interactive-element-affordance", "plugins", "list", "frame-title", "server-response-time", "image-aspect-ratio", "tabindex", "bypass", "custom-controls-roles", "document-title", "viewport", "speed-index", "mainthread-work-breakdown", "performance-budget", "apple-touch-icon", "no-document-write", "valid-source-maps", "aria-valid-attr-value", "use-landmarks", "image-alt", "label", "network-server-latency",] as const;

  const lightHouseAudits = auditsKeys.map((key) => {
    return audits[key];
  });

  const row = [
    now,
    url,
    ...loadingExperienceMetrics.map((v) => v?.percentile),
    ...lightHouseResultScores.map((v) => v?.score),
    ...lightHouseAudits.map((v) => v?.score),
  ] as const;
  return row;
}

async function update(sheetName: string, url: string): Promise<void> {
  const { SPREADSHEET_ID } = process.env;
  if (SPREADSHEET_ID === undefined) {
    throw new Error("SPREADSHEET_ID is not defined");
  }
  const sheets = await getSheet({
    spreadsheetId: SPREADSHEET_ID,
    includeGridData: false,
    // ranges: [ sheetName, ],  
  });

  const sheet = sheets.find((sheet) => {
    if (sheet.properties === undefined) {
      return false;
    }
    return sheet.properties.title === sheetName;
  });
  if (sheet === undefined) {
    // 本当はここでシートを作った方がよさそう
    throw new Error("Invalid sheet name. Sheet name has to be url + number.");
  }
  const pagespeedonline = google.pagespeedonline({ version: "v5", auth: GOOGLEAPIS_AUTH_KEY });
  const { data } = await pagespeedonline.pagespeedapi.runpagespeed({
    category: [
      "performance",
      "accessibility",
      "best-practices",
      "seo",
      "pwa",
    ],
    strategy: "mobile",
    url,
  });

  const insertRecords = createInsertRecord(data, url);
  insertRecords.forEach((v) => {
    console.log(v);
  });

  // insert
  console.log(sheet);
}

async function main() {
  const { SPREADSHEET_ID } = process.env;
  if (SPREADSHEET_ID === undefined) {
    throw new Error("SPREADSHEET_ID is not defined");
  }

  try {
    const urlSheets = await getSheet({
      spreadsheetId: SPREADSHEET_ID,
      includeGridData: true,
      ranges: [ URL_LIST_SHEET_NAME, ],
    });

    const urlsSheet = urlSheets.find((sheet): boolean => {
      if (sheet.properties === undefined) {
        return false;
      }
      return sheet.properties.title === URL_LIST_SHEET_NAME;
    });
    if (urlsSheet === undefined) {
      throw new Error("url list sheet is not found");
    }
  
    const records = getRecords(urlsSheet);

    await Promise.all(records.map(async (record): Promise<void> => {
      if (record.values === undefined) {
        throw new Error("Invalid data. There have to be 'values'.");
      }
      const id = record.values[Column.Id];
      if (id?.formattedValue === undefined || id.formattedValue === null) {
        return; // id カラムに値が無いということはレコードが存在しないとみなす
        // throw new Error("Invalid data. Data of id column is not found.");
      }
      const url = record.values[Column.Url];
      if (url?.formattedValue === undefined || url.formattedValue === null) {
        throw new Error("Invalid data. Data of url column is not found.");
      }
      const sheetName = `url${id.formattedValue}`;

      await update(sheetName, url.formattedValue);
      return;
    }));
  } catch(e) {
    throw e;
  }
}

main().then(() => {
  process.stdout.write("done sucessfully\n");
}).catch((error) => {
  console.error(error);
});