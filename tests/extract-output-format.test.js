import assert from "assert/strict";
import ExcelJs from "exceljs";

import { rowsToWorkbookBuffer } from "../src/extractors/helpers.js";

run();

async function run() {
  await testWorkbookOutputIncludesHeadersAndRows();
  console.log("extract-output-format tests passed");
}

async function testWorkbookOutputIncludesHeadersAndRows() {
  const buffer = await rowsToWorkbookBuffer([
    { source: "cdc_places", geography_name: "Davidson", value: 7.2 },
    { source: "cdc_places", geography_name: "Shelby", value: 8.1 }
  ]);

  const workbook = new ExcelJs.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet("data");
  assert.ok(worksheet);
  assert.equal(worksheet.getCell("A1").value, "source");
  assert.equal(worksheet.getCell("B1").value, "geography_name");
  assert.equal(worksheet.getCell("C1").value, "value");
  assert.equal(worksheet.getCell("A2").value, "cdc_places");
  assert.equal(worksheet.getCell("B2").value, "Davidson");
  assert.equal(worksheet.getCell("C2").value, 7.2);
  assert.equal(worksheet.getCell("B3").value, "Shelby");
  assert.equal(worksheet.getCell("C3").value, 8.1);
}
