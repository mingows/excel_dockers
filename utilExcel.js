var XLSX = require('xlsx');

function setActiveCell(path, sheet, cell) {
    // path: absolute path to workbook file
    // sheet: sheet name to activate
    // cell: column name (e.g., 'A') OR full cell like 'A' (we interpret as column)

    if (!path || !sheet || !cell) throw new Error('setActiveCell requires path, sheet and cell');

    // Read workbook
    var wb = XLSX.readFile(path, {cellStyles: true});

    var ws = wb.Sheets[sheet];
    if (!ws) throw new Error('Sheet not found: ' + sheet);

    // Normalize column (remove digits if user passed a full cell)
    var col = ('' + cell).toUpperCase().replace(/[^A-Z]/g, '');
    if (!col) throw new Error('Invalid column: ' + cell);

    // Find last non-empty row in the column
    var range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    var lastRow = 0;
    for (var R = range.s.r; R <= range.e.r; ++R) {
        var addr = col + (R + 1);
        var v = ws[addr];
        if (v && v.v !== undefined && v.v !== null && (v.v !== '')) {
            lastRow = R + 1;
        }
    }
    // If column has no data, set to first row after header (row 1)
    if (lastRow === 0) lastRow = range.s.r + 1;

    var targetCell = col + lastRow;

    // Set workbook active tab to this sheet
    wb.Workbook = wb.Workbook || {};
    // activeTab expects sheet index (0-based)
    var shtNames = wb.SheetNames || [];
    var sheetIndex = shtNames.indexOf(sheet);
    if (sheetIndex === -1) sheetIndex = 0;
    wb.Workbook.Views = [{activeTab: sheetIndex}];

    // Set sheet view selection so Excel will focus the target cell when opening
    // Use the !sheetViews property which xlsx-js-style / sheetjs supports
    ws['!sheetViews'] = ws['!sheetViews'] || [];
    // Replace or add a view with a selection
    ws['!sheetViews'][0] = ws['!sheetViews'][0] || {};
    ws['!sheetViews'][0].selection = [{sqref: targetCell, activeCell: targetCell}];

    // Write workbook back to same path (overwrite)
    XLSX.writeFile(wb, path, {bookType: 'xlsx', cellStyles: true});
}

module.exports = {
    setActiveCell
}