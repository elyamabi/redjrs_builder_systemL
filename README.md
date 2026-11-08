# RedJr Builders and Construction Supply — Cashier, Inventory & Dashboard

A browser-based point-of-sale and inventory system built with plain HTML, CSS and JavaScript. No install or build step is needed.

## Run locally
1. Extract the ZIP and keep `index.html`, `styles.css`, `script.js` and the `images/` folder together.
2. Open `index.html` in a modern browser (Chrome or Edge recommended).
3. For the **camera barcode scanner**, open the site over `https` (for example on Vercel) or `localhost`; browsers block the camera on plain `file://` pages. USB / Bluetooth barcode scanners work everywhere.

## Demo access
- Email: `admin@redjr.test`
- Password: `redjr123`

## Pages
- **Dashboard** – Total sales (with change vs. yesterday), Low stock items, Total products (SKUs), a stacked **Monthly / Yearly revenue** chart (range filter: all time, this year, last 12 / 6 months), **Inventory status** (Out of stock / Low / High), **Latest transactions** (Today / This week / This month / This year / All time) and **Top selling products** horizontal bar chart with its own period filter. The Low stock and Total products cards open the Inventory page.
- **Cashier** (Point of Sale + Products combined in one page) – tap or scan items, change quantities, Senior/PWD/custom discounts, Cash (with change), GCash, Maya, card or bank transfer, print receipts, hold and resume sales. Shortcuts: `F2` search, `F9` charge. A USB scanner can type into the search box at any time.
- **Add product** (button on the Cashier page) –
  - Photo: upload from the device or take a picture with the phone camera (resized automatically), or paste a link.
  - Barcode: scan with the camera or a scanner. If the code is **already in the system**, you only enter **how many were added** (quick +1 / +5 / +10 buttons) and the stock goes up; "Add & scan next" keeps you scanning. If it is **new**, fill in the details.
  - Product name, category (or a new category), SKU (auto-suggested), unit, cost price, selling price (profit margin is shown), quantity in stock and 
- **Inventory** – stock list with search, category and stock-level filters, **Add stock**, **Edit** and **Delete** for each product, CSV export.
- **Transactions** – all receipts (format `OR-2026-000014`), search and filters, view / print receipt, **refund** (full or partial, with option to return items to stock; status becomes *Partially Refunded* or *Refunded*), Today's summary and CSV export.

Removed from the old version: separate Products page, delivery/pickup Orders, Reports and Activity History (their useful parts are now on the Dashboard and Transactions pages).

## Data and going live
- Data is saved in the browser (`localStorage`), per browser and device. Products and completed sales from the previous version are carried over automatically.
- The system ships with sample products and 12 months of **demo sales**. Open the account menu (top-right avatar): **Reset demo data** restores the samples; **Start fresh (go live)** deletes all sales but keeps your products and stock. Do this before recording real sales.
- Prices are treated as **VAT-inclusive (12%)**. Receipts are sales receipts only, not official BIR receipts.
- Login is a front-end demo, not secure authentication. For several computers or users at once, a backend and database would be needed.

## Deploy to Vercel
1. Upload the project to a GitHub repository.
2. In Vercel choose **Add New → Project**, import the repo, framework preset **Other**, leave the build command blank, output directory `.`.
3. Deploy. No environment variables are needed.

## Product photographs
The sample catalog loads photos from Wikimedia Commons; if one cannot load (for example offline), the bundled picture in `images/` is shown. Photos you upload yourself are stored in the browser. Check each Commons file page for license terms before redistributing the project.
