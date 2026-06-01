import jsPDF from "jspdf";
import { formatMoney, parseDate, type Bill, type Payment } from "./bills";
import type { Transaction } from "./queries";

export type MonthlyReportInput = {
  year: number;
  monthIndex: number; // 0..11
  displayName: string;
  currency: string;
  bills: Bill[];
  payments: Payment[];
  transactions: Transaction[];
};

function inMonth(iso: string, year: number, monthIndex: number) {
  const d = parseDate(iso);
  return d.getFullYear() === year && d.getMonth() === monthIndex;
}

export function buildMonthlyReport(input: MonthlyReportInput): Blob {
  const { year, monthIndex, displayName, currency, bills, payments, transactions } = input;
  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const billById = new Map(bills.map((b) => [b.id, b]));
  const monthPayments = payments.filter((p) => inMonth(p.paid_on, year, monthIndex));
  const monthTxns = transactions.filter((t) => inMonth(t.occurred_on, year, monthIndex));

  const billsTotal = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
  const expenseTxnTotal = monthTxns
    .filter((t) => t.kind === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const incomeTxnTotal = monthTxns
    .filter((t) => t.kind === "income")
    .reduce((s, t) => s + Number(t.amount), 0);

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const left = 48;
  let y = 64;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Kyte — Monthly Statement", left, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  y += 22;
  doc.text(`${displayName || "Account"} · ${monthLabel}`, left, y);

  y += 28;
  doc.setDrawColor(220);
  doc.line(left, y, 564, y);

  // Summary
  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Summary", left, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  y += 18;
  doc.text(`Bills paid:        ${formatMoney(billsTotal, currency)}`, left, y);
  y += 16;
  doc.text(`Other expenses:    ${formatMoney(expenseTxnTotal, currency)}`, left, y);
  y += 16;
  doc.text(`Other income:      ${formatMoney(incomeTxnTotal, currency)}`, left, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.text(
    `Net:               ${formatMoney(incomeTxnTotal - billsTotal - expenseTxnTotal, currency)}`,
    left,
    y,
  );

  // Bills paid table
  y += 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Bills paid", left, y);
  y += 18;
  doc.setFontSize(10);

  if (monthPayments.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.text("No bills paid this month.", left, y);
    y += 16;
  } else {
    monthPayments.forEach((p) => {
      if (y > 740) {
        doc.addPage();
        y = 64;
      }
      const name = billById.get(p.bill_id)?.name ?? "(deleted bill)";
      doc.setFont("helvetica", "normal");
      doc.text(`${p.paid_on}   ${name}`, left, y);
      doc.text(formatMoney(Number(p.amount), currency), 540, y, { align: "right" });
      y += 14;
    });
  }

  // Transactions
  y += 20;
  if (y > 720) {
    doc.addPage();
    y = 64;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Transactions", left, y);
  y += 18;
  doc.setFontSize(10);

  if (monthTxns.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.text("No transactions logged this month.", left, y);
  } else {
    monthTxns.forEach((t) => {
      if (y > 740) {
        doc.addPage();
        y = 64;
      }
      doc.setFont("helvetica", "normal");
      const sign = t.kind === "income" ? "+" : "-";
      doc.text(`${t.occurred_on}   ${t.name} (${t.category})`, left, y);
      doc.text(`${sign}${formatMoney(Number(t.amount), currency)}`, 540, y, {
        align: "right",
      });
      y += 14;
    });
  }

  return doc.output("blob");
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function lastNMonths(n: number, from = new Date()): { year: number; monthIndex: number }[] {
  const out: { year: number; monthIndex: number }[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let i = 0; i < n; i++) {
    out.push({ year: cursor.getFullYear(), monthIndex: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return out;
}
