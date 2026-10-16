import * as XLSX from 'xlsx';
import { transactionStore } from './db';

export const exportTransactionsToExcel = async () => {
  const transactions = [];
  await transactionStore.iterate((val) => { transactions.push(val); });

  if (transactions.length === 0) {
    alert('Belum ada transaksi tersimpan!');
    return;
  }

  const rows = [];
  transactions.forEach((trx) => {
    trx.items.forEach((item) => {
      rows.push({
        'ID Transaksi': trx.id,
        'Waktu': new Date(trx.date).toLocaleString('id-ID'),
        'Produk': item.name,
        'Harga Satuan': item.price,
        'Qty': item.qty,
        'Subtotal': item.qty * item.price,
        'Total Belanja': trx.total,
        'Bayar': trx.cash,
        'Kembalian': trx.change
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan');

  const fileName = `Rekap_Kasir_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};