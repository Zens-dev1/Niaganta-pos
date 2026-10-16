import React from 'react';

export default function Receipt({ data }) {
  if (!data) return null;

  return (
    <div id="thermal-receipt">
      <style>{`
        @media screen {
          #thermal-receipt { display: none; }
        }
        @media print {
          @page {
            size: 58mm auto;
            margin: 0;
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
            max-width: 48mm;
            box-sizing: border-box;
            padding: 2mm 1mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 10px;
            line-height: 1.2;
            color: #000;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .divider { border-bottom: 1px dashed #000; margin: 4px 0; }
        }
      `}</style>

      <div className="text-center">
        <strong style={{ fontSize: '13px' }}>NIAGANTA POS</strong><br />
        <div className="divider" />
        No: {data.id}<br />
        {new Date(data.date).toLocaleString('id-ID')}<br />
        <div className="divider" />
      </div>

      <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
        <tbody>
          {data.items.map((item, idx) => (
            <React.Fragment key={idx}>
              <tr>
                <td colSpan="2" style={{ wordBreak: 'break-word', paddingTop: '2px' }}>
                  {item.name}
                </td>
              </tr>
              <tr>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {item.qty} x {item.price.toLocaleString('id-ID')}
                </td>
                <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                  {(item.qty * item.price).toLocaleString('id-ID')}
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <div className="divider" />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Total:</span>
        <strong>Rp {data.total.toLocaleString('id-ID')}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Tunai:</span>
        <span>Rp {data.cash.toLocaleString('id-ID')}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Kembali:</span>
        <span>Rp {data.change.toLocaleString('id-ID')}</span>
      </div>
      <div className="divider" />

      <div className="text-center" style={{ marginTop: '6px' }}>
        Terima kasih atas kunjungannya!
      </div>
    </div>
  );
}