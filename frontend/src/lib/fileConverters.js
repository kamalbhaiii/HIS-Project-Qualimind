import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Convert JSON content → CSV string
export const jsonToCsv = (jsonArray) => {
  if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
    return '';
  }
  return Papa.unparse(jsonArray);
};

// Convert XLS/XLSX → CSV string
export const excelToCsv = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const csvString = jsonToCsv(json);

        resolve(csvString);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

// Convert JSON file → CSV string
export const jsonFileToCsv = async (file) => {
  const text = await file.text();
  const json = JSON.parse(text);

  if (Array.isArray(json)) {
    return jsonToCsv(json);
  }

  // If JSON object, attempt to extract array
  if (Array.isArray(json.data)) {
    return jsonToCsv(json.data);
  }

  throw new Error('Invalid JSON format. Expected an array of objects.');
};
