import { format } from 'date-fns';
import { Workbook } from 'exceljs';
import { Response } from 'express';

export function cell<T>(column: SheetColumn<T>, columnIndex: number, item: T) {
  return [`c${columnIndex}`, column.value(item) ?? ''] as const;
}

export type SheetColumn<T> = {
  header: string;
  width?: number;
  value: (item: T) => string | number | Date | undefined;
};

export function excelDate(d?: Date) {
  if (!d) return '';
  const date = new Date(d);
  return format(date, 'do MMMM yyyy HH:mm');
}

export function addSheetFromArray<T>(
  book: Workbook,
  name: string,
  input: T[],
  columns: SheetColumn<T>[],
) {
  const sheet = book.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = columns.map((c, i) => ({
    header: c.header,
    key: `c${i}`,
    width: c.width || 20,
  }));
  sheet.addRows(
    input.map((item) =>
      Object.fromEntries(columns.map((c, i) => cell(c, i, item))),
    ),
  );
  sheet.eachRow((r) =>
    r.eachCell((c) => (c.alignment = { vertical: 'middle' })),
  );

  return sheet;
}

export function sendExcel(
  res: Response,
  content: ArrayBuffer | Buffer,
  prefix: string,
) {
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
  const filename = `${prefix}-${timestamp}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Length', content.byteLength);
  res.setHeader('Content-Type', 'application/vnd.ms-excel');
  res.send(content);
}
