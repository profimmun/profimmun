import { strToU8, zipSync } from "fflate";

export type XlsxSheet = {
  name: string;
  rows: Array<Array<string | number | null | undefined>>;
  widths?: number[];
};

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index: number): string {
  let n = index + 1;
  let name = "";

  while (n > 0) {
    const mod = (n - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    n = Math.floor((n - mod) / 26);
  }

  return name;
}

function sheetName(name: string): string {
  return name.replace(/[\[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Лист";
}

function cellXml(value: string | number | null | undefined, rowIndex: number, colIndex: number): string {
  if (value === null || value === undefined || value === "") return "";

  const ref = `${columnName(colIndex)}${rowIndex + 1}`;
  const style = rowIndex === 0 ? 1 : typeof value === "string" && value.includes("\n") ? 2 : 0;

  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }

  return `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${escapeXml(
    String(value)
  )}</t></is></c>`;
}

function sheetXml(sheet: XlsxSheet): string {
  const maxColumns = Math.max(...sheet.rows.map((row) => row.length), sheet.widths?.length ?? 0, 1);
  const cols = Array.from({ length: maxColumns }, (_, index) => {
    const width = sheet.widths?.[index] ?? 18;
    const col = index + 1;
    return `<col min="${col}" max="${col}" width="${width}" customWidth="1"/>`;
  }).join("");

  const rows = sheet.rows
    .map((row, rowIndex) => {
      const cells = row.map((cell, colIndex) => cellXml(cell, rowIndex, colIndex)).join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>${cols}</cols>
  <sheetData>${rows}</sheetData>
</worksheet>`;
}

function workbookXml(sheets: XlsxSheet[]): string {
  const entries = sheets
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheetName(sheet.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${entries}</sheets>
</workbook>`;
}

function workbookRelsXml(sheets: XlsxSheet[]): string {
  const sheetRels = sheets
    .map(
      (_sheet, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join("");
  const stylesId = sheets.length + 1;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${stylesId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function contentTypesXml(sheets: XlsxSheet[]): string {
  const overrides = sheets
    .map(
      (_sheet, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${overrides}
</Types>`;
}

const packageRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1">
      <alignment wrapText="1" vertical="top"/>
    </xf>
  </cellXfs>
</styleSheet>`;

export function createXlsx(sheets: XlsxSheet[]): Uint8Array {
  const normalizedSheets = sheets.length > 0 ? sheets : [{ name: "Ответы", rows: [["Нет данных"]] }];
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(contentTypesXml(normalizedSheets)),
    "_rels/.rels": strToU8(packageRelsXml),
    "xl/workbook.xml": strToU8(workbookXml(normalizedSheets)),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRelsXml(normalizedSheets)),
    "xl/styles.xml": strToU8(stylesXml),
  };

  normalizedSheets.forEach((sheet, index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(sheetXml(sheet));
  });

  return zipSync(files);
}
