export function downloadInvoice(tx: any, user: any) {
  const invoiceNo = `INV-WT-${tx.id.toString().padStart(6, '0')}`;
  const dateStr = new Date(tx.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const baseAmount = parseFloat(tx.amount || 0).toFixed(2);
  const gstAmount = parseFloat(tx.gst_amount || (tx.amount * 0.18)).toFixed(2);
  const totalPaid = parseFloat(tx.total_paid || (tx.amount * 1.18)).toFixed(2);
  const gstRate = tx.gst_rate || 18.0;

  const cgstAmount = (parseFloat(gstAmount) / 2).toFixed(2);
  const sgstAmount = (parseFloat(gstAmount) / 2).toFixed(2);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tax Invoice - ${invoiceNo}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 30px;
            font-size: 14px;
            line-height: 1.5;
            background-color: #f8fafc;
        }
        .invoice-box {
            max-width: 800px;
            margin: auto;
            border: 1px solid #e2e8f0;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            padding: 40px;
            background: #fff;
            border-radius: 16px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #10b981;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .logo {
            font-size: 26px;
            font-weight: bold;
            color: #10b981;
            letter-spacing: -0.5px;
        }
        .title {
            font-size: 20px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
            letter-spacing: 1px;
        }
        .meta-table {
            width: 100%;
            margin-bottom: 30px;
            border-spacing: 0;
        }
        .meta-table td {
            vertical-align: top;
            width: 50%;
            padding: 0;
            line-height: 1.6;
        }
        .bold {
            font-weight: bold;
            color: #0f172a;
        }
        .text-right {
            text-align: right;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th, .items-table td {
            border: 1px solid #e2e8f0;
            padding: 12px;
            text-align: left;
        }
        .items-table th {
            background-color: #f1f5f9;
            font-weight: bold;
            color: #334155;
        }
        .totals-table {
            width: 45%;
            margin-left: auto;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .totals-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        .totals-table tr.grand-total td {
            font-weight: bold;
            font-size: 16px;
            color: #10b981;
            border-top: 2px solid #10b981;
            border-bottom: 2px solid #10b981;
            background-color: #f0fdf4;
        }
        .footer {
            margin-top: 60px;
            text-align: center;
            color: #64748b;
            font-size: 11px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
        }
        .print-btn {
            display: block;
            width: 100%;
            max-width: 200px;
            margin: 20px auto 0 auto;
            padding: 10px 20px;
            background-color: #10b981;
            color: #fff;
            text-align: center;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
            transition: background-color 0.2s;
        }
        .print-btn:hover {
            background-color: #059669;
        }
        @media print {
            body {
                background-color: #fff;
                padding: 0;
            }
            .invoice-box {
                border: none;
                box-shadow: none;
                padding: 0;
            }
            .print-btn {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div class="logo">Advisor Connect</div>
            <div class="title">TAX INVOICE</div>
        </div>
        
        <table class="meta-table">
            <tr>
                <td>
                    <span class="bold">Billed From:</span><br>
                    <strong>Advisor Connect India Pvt. Ltd.</strong><br>
                    102, Cyber Tower, Sector 62<br>
                    Noida, Uttar Pradesh - 201301<br>
                    Email: finance@advisorconnect.in<br>
                    <span class="bold">GSTIN:</span> 09AAACA1234F1ZP
                </td>
                <td class="text-right">
                    <span class="bold">Invoice Details:</span><br>
                    <strong>Invoice No:</strong> ${invoiceNo}<br>
                    <strong>Date & Time:</strong> ${dateStr}<br>
                    <strong>Place of Supply:</strong> Uttar Pradesh (09)<br>
                    <br>
                    <span class="bold">Billed To:</span><br>
                    <strong>${user.display_name}</strong> (@${user.username})<br>
                    Email: ${user.email || 'N/A'}<br>
                    User ID: ${user.id}<br>
                    Category: ${user.category || 'General'}
                </td>
            </tr>
        </table>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 12%;">SAC Code</th>
                    <th style="width: 48%;">Services Description</th>
                    <th style="width: 15%;" class="text-right">Price (₹)</th>
                    <th style="width: 10%;" class="text-right">Qty</th>
                    <th style="width: 15%;" class="text-right font-bold">Taxable Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>998311</td>
                    <td>Advisor Wallet Recharge Credit (Principal balance credited)</td>
                    <td class="text-right">₹${baseAmount}</td>
                    <td class="text-right">1</td>
                    <td class="text-right font-bold">₹${baseAmount}</td>
                </tr>
            </tbody>
        </table>
        
        <table class="totals-table">
            <tr>
                <td class="bold">Taxable Value:</td>
                <td class="text-right font-bold">₹${baseAmount}</td>
            </tr>
            <tr>
                <td>CGST @ 9%:</td>
                <td class="text-right">₹${cgstAmount}</td>
            </tr>
            <tr>
                <td>SGST @ 9%:</td>
                <td class="text-right">₹${sgstAmount}</td>
            </tr>
            <tr>
                <td class="bold">Total GST (${gstRate}%):</td>
                <td class="text-right font-bold">₹${gstAmount}</td>
            </tr>
            <tr class="grand-total">
                <td>Total Paid Amount (incl. GST):</td>
                <td class="text-right">₹${totalPaid}</td>
            </tr>
        </table>
        
        <div class="footer">
            <p>Thank you for choosing Advisor Connect. This is a computer generated tax invoice and does not require physical signatures.</p>
            <p>&copy; ${new Date().getFullYear()} Advisor Connect. All Rights Reserved.</p>
        </div>
        
        <button class="print-btn" onclick="window.print()">Print Invoice / Save PDF</button>
    </div>
</body>
</html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice_${invoiceNo}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
