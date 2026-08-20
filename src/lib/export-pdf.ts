import "server-only";
import PDFDocument from "pdfkit";
import { toMajorUnits } from "@/lib/money";
import { REPORT_APP_NAME, type ReportDefinition } from "@/lib/report";

const PAGE_MARGIN = 36;
const INK = "#0f172a";
const MUTED = "#64748b";
const RULE = "#cbd5e1";
const HEADER_BG = "#1e293b";
const ZEBRA_BG = "#f1f5f9";

/**
 * pdfkit's built-in fonts are WinAnsi-encoded and cannot render "৳", so
 * amounts are written with the ASCII currency code in PDF output.
 */
function formatCell(value: unknown, format?: string): string {
  if (value === null || value === undefined || value === "") return "-";
  switch (format) {
    case "currency":
      return `BDT ${toMajorUnits(Number(value)).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    case "number":
      return Number(value).toLocaleString("en-US");
    case "date":
      return value instanceof Date
        ? value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : String(value);
    case "datetime":
      return value instanceof Date
        ? value.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : String(value);
    default:
      return String(value);
  }
}

/**
 * Renders a report definition to a landscape A4 PDF with a branded header,
 * report metadata, applied filters, a summary block and a paginated table.
 */
export async function buildPdfReport<T>(report: ReportDefinition<T>): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: PAGE_MARGIN,
    bufferPages: true,
    info: {
      Title: report.title,
      Author: REPORT_APP_NAME,
      CreationDate: report.generatedAt,
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const contentWidth = doc.page.width - PAGE_MARGIN * 2;

  // ---- Document header -----------------------------------------------------
  doc.font("Helvetica-Bold").fontSize(18).fillColor(INK).text(REPORT_APP_NAME);
  doc.font("Helvetica-Bold").fontSize(13).fillColor("#334155").text(report.title);
  if (report.subtitle) {
    doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(report.subtitle);
  }
  doc.moveDown(0.4);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(MUTED)
    .text(
      `Generated ${report.generatedAt.toLocaleString("en-GB")}  •  By ${report.generatedBy}  •  ${report.rows.length} record${report.rows.length === 1 ? "" : "s"}`,
    );

  doc.moveDown(0.6);
  doc
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(PAGE_MARGIN + contentWidth, doc.y)
    .lineWidth(1)
    .strokeColor(RULE)
    .stroke();
  doc.moveDown(0.6);

  // ---- Applied filters and summary, side by side ---------------------------
  const metaTop = doc.y;
  const columnWidth = (contentWidth - 24) / 2;

  doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text("Applied filters", PAGE_MARGIN, metaTop, {
    width: columnWidth,
  });
  doc.font("Helvetica").fontSize(9).fillColor(MUTED);
  for (const filter of report.filters) {
    doc.text(`${filter.label}: ${filter.value}`, { width: columnWidth });
  }
  const filtersBottom = doc.y;

  let summaryBottom = metaTop;
  if (report.summary.length > 0) {
    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(INK)
      .text("Summary", PAGE_MARGIN + columnWidth + 24, metaTop, { width: columnWidth });
    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    for (const item of report.summary) {
      doc.text(`${item.label}: ${item.value}`, PAGE_MARGIN + columnWidth + 24, doc.y, {
        width: columnWidth,
      });
    }
    summaryBottom = doc.y;
  }

  doc.y = Math.max(filtersBottom, summaryBottom) + 14;

  // ---- Table ---------------------------------------------------------------
  // Columns flagged `pdfHidden` are dropped so the remaining ones stay legible.
  const columns = report.columns.filter((column) => !column.pdfHidden);
  const weights = columns.map((column) => column.width ?? 20);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const widths = weights.map((weight) => (weight / weightTotal) * contentWidth);

  const CELL_PADDING = 5;

  // Header labels may wrap, so the band is sized to the tallest one.
  doc.font("Helvetica-Bold").fontSize(8.5);
  const headerHeight =
    Math.max(
      12,
      ...columns.map((column, index) =>
        doc.heightOfString(column.header, { width: widths[index] - CELL_PADDING * 2 }),
      ),
    ) +
    CELL_PADDING * 2;

  const drawHeader = () => {
    const y = doc.y;
    doc.rect(PAGE_MARGIN, y, contentWidth, headerHeight).fill(HEADER_BG);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#ffffff");
    let x = PAGE_MARGIN;
    columns.forEach((column, index) => {
      doc.text(column.header, x + CELL_PADDING, y + CELL_PADDING, {
        width: widths[index] - CELL_PADDING * 2,
      });
      x += widths[index];
    });
    doc.y = y + headerHeight;
  };

  const bottomLimit = () => doc.page.height - PAGE_MARGIN - 24;

  drawHeader();

  if (report.rows.length === 0) {
    doc
      .font("Helvetica-Oblique")
      .fontSize(10)
      .fillColor(MUTED)
      .text("No records matched the applied filters.", PAGE_MARGIN, doc.y + 12, {
        width: contentWidth,
        align: "center",
      });
  }

  report.rows.forEach((item, rowIndex) => {
    const cells = columns.map((column) => formatCell(column.value(item), column.format));

    // Measure first so a tall row is moved to the next page intact.
    doc.font("Helvetica").fontSize(8.5);
    const rowHeight =
      Math.max(
        ...cells.map((text, index) =>
          doc.heightOfString(text, { width: widths[index] - CELL_PADDING * 2 }),
        ),
      ) +
      CELL_PADDING * 2;

    if (doc.y + rowHeight > bottomLimit()) {
      doc.addPage();
      doc.y = PAGE_MARGIN;
      drawHeader();
    }

    const y = doc.y;
    if (rowIndex % 2 === 1) {
      doc.rect(PAGE_MARGIN, y, contentWidth, rowHeight).fill(ZEBRA_BG);
    }

    doc.font("Helvetica").fontSize(8.5).fillColor(INK);
    let x = PAGE_MARGIN;
    cells.forEach((text, index) => {
      const isNumeric =
        columns[index].format === "currency" || columns[index].format === "number";
      doc.text(text, x + CELL_PADDING, y + CELL_PADDING, {
        width: widths[index] - CELL_PADDING * 2,
        align: isNumeric ? "right" : "left",
      });
      x += widths[index];
    });

    doc
      .moveTo(PAGE_MARGIN, y + rowHeight)
      .lineTo(PAGE_MARGIN + contentWidth, y + rowHeight)
      .lineWidth(0.5)
      .strokeColor("#e2e8f0")
      .stroke();

    doc.y = y + rowHeight;
  });

  // ---- Page numbers --------------------------------------------------------
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    // The footer sits inside the bottom margin; without this pdfkit would
    // treat it as overflow and append a blank page.
    doc.page.margins.bottom = 0;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `${REPORT_APP_NAME} — ${report.title}    Page ${i - range.start + 1} of ${range.count}`,
        PAGE_MARGIN,
        doc.page.height - PAGE_MARGIN + 4,
        { width: contentWidth, align: "center", lineBreak: false },
      );
  }

  doc.end();
  return finished;
}
