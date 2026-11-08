# ITEC 80 Usability Evaluation — RedJr Builders and Construction Supply

## Prototype and purpose
**Prototype:** RedJr Builders and Construction Supply — Cashier, Inventory and Sales Dashboard  
**Method:** Informal self-test using the browser prototype. This is a proposed evaluation; replace or supplement it with actual observations from classmates/test users before submitting. Do not claim user testing occurred if it has not.

## Test scenario
A cashier sells construction supplies to a walk-in customer, adds a newly delivered product by scanning its barcode, processes a refund, and then checks the dashboard.

## Task checklist
- [ ] Sign in using the demo credentials.
- [ ] Open Cashier and search for "Portland Cement" (or type its SKU and press Enter).
- [ ] Add a quantity to the current sale and apply a Senior/PWD discount.
- [ ] Charge the sale with cash and note the change shown.
- [ ] Click Add product, scan or type a new barcode, add a photo, fill in the details and save.
- [ ] Add product again with the same barcode and enter how many were added.
- [ ] Open Transactions, find the new receipt and refund one item.
- [ ] Open Inventory and verify the stock changed (sale, refund and added stock).
- [ ] Return to Dashboard and confirm Total sales, Latest transactions and Inventory status are updated.

## Usability/design issues and improvements

| Issue found or risk | Improvement made/proposed | HCI principle |
|---|---|---|
| Users may be unsure whether a tap added an item or saved a record. | Toast feedback for adding stock, products, refunds and sales; a "Sale complete" screen with change due. | Feedback / Visibility |
| Adding stock item by item is slow. | Scan the barcode: an existing product only asks "how many were added"; "Add & scan next" keeps the flow going. | Efficiency / Flexibility |
| Users may sell more units than are available. | Out-of-stock items are disabled and quantities are checked against current stock. | Error prevention / Constraints |
| A duplicate SKU, barcode or product name could cause confusion. | Uniqueness is checked before saving and the field with the problem is focused. | Error prevention / Consistency |
| Cashiers may not recognize items by name alone. | Product photos (upload or camera) on every cashier tile and inventory row. | Recognition rather than recall |
| A mistaken sale cannot be undone. | Refund screen (full or partial) that can return items to stock and keeps a record. | User control and freedom |
| Low stock is easy to miss. | Dashboard Low stock card and Inventory status bars, a badge on the Inventory menu, and colour + text status labels. | Visibility / Visual hierarchy |
| Users on a phone have little room. | Collapsible navigation, 2-column product grid, scrolling modals, and a sticky cart bar. | Responsive design / Accessibility |

## Test result recording sheet
Complete this after actually running the prototype or asking a classmate to try it.

| Task | Completed? | Time / difficulty | Observation |
|---|---|---|---|
| Find a product in Cashier | ______ | ______ | ______ |
| Complete a cash sale | ______ | ______ | ______ |
| Add a new product with photo and barcode | ______ | ______ | ______ |
| Add stock to an existing product by scanning | ______ | ______ | ______ |
| Refund an item | ______ | ______ | ______ |

## Evaluation conclusion
The prototype supports an end-to-end sale, refund and restock workflow and connects the cashier, inventory and dashboard. It demonstrates consistency, visibility, feedback, user control, error prevention, clear navigation, and visual hierarchy. The evaluation should be updated with real test observations, including any confusion, errors, and changes made after testing.
