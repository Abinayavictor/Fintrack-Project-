import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Download, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { CsvImportReport } from '../../types';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<CsvImportReport>;
  onSuccess: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [report, setReport] = useState<CsvImportReport | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setReport(null);
    setGeneralError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setGeneralError('Please upload a valid .csv file.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setGeneralError(null);
      setReport(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setGeneralError('Please upload a valid .csv file.');
        return;
      }
      setSelectedFile(file);
      setGeneralError(null);
      setReport(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setGeneralError(null);

    try {
      const res = await onImport(selectedFile);
      setReport(res);
      if (res.imported_count > 0) {
        onSuccess();
      }
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'CSV import failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleCsv = `Title,Amount,Category,Date,Payment Method
Whole Foods Groceries,$128.50,Food,2026-10-02,Credit Card
Electric & Gas Utility,94.20,Utilities,2026-10-03,Debit Card
Metro Monthly Pass,$125.00,Transport,2026-10-01,Credit Card
Apartment Maintenance,$1,200.00,Housing,2026-10-04,Bank Transfer
Cinema Tickets,32.00,Entertainment,2026-10-05,Credit Card
Dental Cleaning & Exam,$185.00,Healthcare,2026-10-06,Debit Card
Office Supplies & Books,$42.99,Misc,2026-10-07,Credit Card
Faulty Negative Expense,-50.00,Food,2026-10-10,Credit Card
Faulty Malformed Date,25.00,Transport,not-a-valid-date,Debit Card
`;
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'fintrack_sample_expenses.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Expenses via CSV"
      description="Upload a CSV file with automatic header detection, currency parsing, and row validation"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Sample CSV Download Helper */}
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <FileText className="w-4 h-4 text-brand-600" />
            <span>Need a template to test with?</span>
          </div>
          <button
            type="button"
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/60 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV</span>
          </button>
        </div>

        {generalError && (
          <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl">
            {generalError}
          </div>
        )}

        {/* Dropzone */}
        {!report && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-800/30 transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            {selectedFile ? (
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB — Click or drag another file to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Click to browse or drag and drop your CSV
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports Title, Amount (with $ and commas), Category, Date, Payment Method
                </p>
              </div>
            )}
          </div>
        )}

        {/* Results Report Card */}
        {report && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <p className="text-xs text-slate-500">Total Rows</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {report.total_rows}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Imported</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                  {report.imported_count}
                </p>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 text-center">
                <p className="text-xs text-rose-600 dark:text-rose-400">Rejected</p>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1">
                  {report.failed_count}
                </p>
              </div>
            </div>

            {/* Error details if any */}
            {report.errors.length > 0 && (
              <div className="border border-rose-200 dark:border-rose-900 rounded-xl overflow-hidden">
                <div className="bg-rose-50 dark:bg-rose-950/60 px-4 py-2 border-b border-rose-200 dark:border-rose-900 flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                    Row-Level Rejection Log ({report.errors.length})
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-rose-100 dark:divide-rose-950 text-xs">
                  {report.errors.map((err, idx) => (
                    <div key={idx} className="p-2.5 flex items-start gap-2 bg-white dark:bg-slate-900">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Line {err.row} [{err.field}]:
                        </span>{' '}
                        <span className="text-slate-600 dark:text-slate-300">{err.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {report ? 'Close' : 'Cancel'}
          </button>
          {!report && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedFile || isUploading}
              className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {isUploading ? 'Ingesting...' : 'Import CSV'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
