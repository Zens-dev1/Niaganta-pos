import React from 'react';

export default function Receipt({ data, storeInfo }) {
  if (!data) return null;

  const info = storeInfo || {
    storeName: 'Niaganta Pos',
    address: 'Jl. Kediri No. 4',
    phone: '-',
    footerMsg: 'Terima kasih!'
  };

  return (
    <div id="thermal-receipt" className="receipt-container">
      <style>{`
        @media screen {
          #thermal-receipt {
            display: none !important;
            pointer-events: none !important;
          }
        }
        @media print {
          @page {
            margin: 0;
            size: 58mm auto;
          }
          body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          body * {
            visibility: hidden;
          }
          #thermal-receipt, #thermal-receipt * {
            visibility: visible;
          }
          #thermal-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 48mm;
            padding: 4mm 2mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.25;
            color: #000;
          }
          .receipt-center {
            text-align: center;
          }
          .receipt-divider {
            border-top: 1px dashed #000;
            margin: 4px 0;
          }
          .receipt-row {
            display: flex;
            justify-content: space-between;
          }
        }
      `}</style>

      {/* Header Nota */}
      <div className="receipt-center">
        <strong style={{ fontSize: '13px' }}>{info.storeName}</strong>
        <div>{info.address}</div>
        <div>Telp: {info.phone}</div>
      </div>

      <div className="receipt-divider" />

      {/* Info Transaksi */}
      <div>No  : {data.id}</div>
      <div>Tgl : {new Date(data.date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
      <div>Met : {data.method}</div>

      <div className="receipt-divider" />

      {/* Daftar Barang */}
      {data.items.map((item, idx) => (
        <div key={idx} style={{ marginBottom: '3px' }}>
          <div>{item.name}</div>
          <div className="receipt-row">
            <span>{item.qty} x {item.price.toLocaleString('id-ID')}</span>
            <span>{(item.qty * item.price).toLocaleString('id-ID')}</span>
          </div>
        </div>
      ))}

      <div className="receipt-divider" />

      {/* Total & Bayar */}
      <div className="receipt-row">
        <strong>TOTAL:</strong>
        <strong>Rp {data.total.toLocaleString('id-ID')}</strong>
      </div>
      <div className="receipt-row">
        <span>BAYAR ({data.method}):</span>
        <span>Rp {data.cash.toLocaleString('id-ID')}</span>
      </div>
      <div className="receipt-row">
        <span>KEMBALI:</span>
        <span>Rp {data.change.toLocaleString('id-ID')}</span>
      </div>

      <div className="receipt-divider" />

      {/* Footer Nota */}
      <div className="receipt-center" style={{ marginTop: '4px' }}>
        <div>{info.footerMsg}</div>
      </div>
    </div>
  );
}