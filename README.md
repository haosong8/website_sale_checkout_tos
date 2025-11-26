# Website Sale Checkout Terms of Service

## Overview

This module adds a Terms of Service acknowledgment step to the Odoo 18 website checkout flow. Customers must acknowledge that they will sign the final terms and conditions with the sales quote before proceeding to checkout. The acknowledgment is stored on the sale order with timestamp and version for audit purposes.

## Features

- **Simple Acknowledgment**: Customers check a box to acknowledge they will sign final terms with the sales quote
- **Enforcement**: Controller-side validation ensures acknowledgment cannot be bypassed
- **Audit Trail**: Acknowledgment is stored on sale orders with timestamp and version
- **Company Terms Integration**: Uses company invoice terms for checkout terms content
- **Review Modal**: Customers can review checkout terms in a modal dialog before accepting
- **Reusable**: Works across all ecommerce products (windows, flooring, etc.)

## Installation

1. Copy this module to your Odoo addons directory
2. Update the apps list in Odoo
3. Install "Website Sale Checkout Terms of Service"

## Configuration

### Module Settings

1. Go to **Website → Configuration → Settings**
2. Scroll to the **"Checkout Terms & Conditions"** section
3. Configure the following:
   - **Enable Terms of Service**: Toggle to enable/disable the acknowledgment checkbox at checkout
   - **TOS Version**: Version identifier (e.g., "v1.0", "2025-11-24") that will be stored with each order acceptance

### Company Terms Configuration

The checkout terms content is automatically pulled from your company's invoice terms:

1. Go to **Settings → Companies → Companies**
2. Select your company
3. Configure the **Invoice Terms** field (HTML supported)
4. This content will be displayed in the checkout terms modal and linked page

## Usage

### For Customers

1. On the cart and payment pages, customers see a checkbox with the text: "I acknowledge that I will sign the final terms and conditions with the sales quote."
2. If company invoice terms are configured, customers can:
   - Click "Review checkout terms" to open a modal dialog with the terms
   - Click "Open full page" to view terms in a new tab
3. Customers must check the acknowledgment box before proceeding to checkout
4. The checkout button is disabled until the checkbox is checked
5. Final terms and conditions are signed with the sales quote (not displayed at checkout)

### For Administrators

- View TOS acknowledgment status on sale orders:
  - **TOS Accepted**: Boolean field indicating acknowledgment
  - **TOS Accepted On**: Timestamp of acknowledgment
  - **TOS Version**: Version of TOS that was acknowledged
- TOS acknowledgment is automatically logged in the order's message history
- All TOS fields on sale orders are read-only for audit purposes

## Technical Details

### Models Extended

- `res.config.settings`: Added TOS configuration fields:
  - `tos_enabled`: Boolean to enable/disable the feature
  - `tos_version`: Version identifier for tracking TOS changes
- `sale.order`: Added TOS acknowledgment fields:
  - `tos_accepted`: Boolean indicating customer acknowledgment
  - `tos_accepted_on`: Datetime of acknowledgment
  - `tos_version`: Version of TOS that was acknowledged

### Controllers

- `website_sale`: Extended with the following methods:
  - `_is_tos_enabled()`: Checks if TOS functionality is enabled
  - `_get_tos_config()`: Retrieves TOS configuration and company invoice terms
  - `payment_transaction()`: Validates TOS acceptance before payment
  - `checkout()`: Validates TOS acceptance during checkout
  - `cart()`: Adds TOS config to cart page context
  - `get_tos_block()`: Returns TOS block HTML for JavaScript injection

### Views

- Settings form: Added "Checkout Terms & Conditions" configuration section
- Sale order form: Added TOS fields for auditability (read-only)
- Payment page: Added TOS checkbox with review modal
- Cart page: TOS checkbox injected via JavaScript

### Templates

- `tos_cart_block`: Standalone TOS block template for JavaScript injection
- `website_sale_payment_tos`: Inherits payment page to add TOS checkbox
- `checkout_tos_modal`: Modal dialog for reviewing checkout terms

## Security

- TOS fields on sale orders are read-only for all users (audit trail protection)
- Configuration is restricted to system administrators
- Controller validation prevents bypassing TOS acknowledgment
- Validation occurs at multiple points (cart, checkout, payment) to ensure compliance

## Integration with Other Modules

This module is designed to work alongside other ecommerce modules:

- **Window Order Status**: TOS acknowledgment can be viewed in order status views
- **Window Website Deposit**: TOS acknowledgment is required before deposit payment
- Works with any product type (windows, flooring, etc.)
- Integrates with company invoice terms for centralized terms management

## Notes

- The module uses the company's invoice terms (`invoice_terms_html`) for checkout terms content
- If no invoice terms are configured, the review links will not appear, but the acknowledgment checkbox is still required
- The TOS version should be updated whenever terms change to track which version customers accepted
- All TOS data is stored on the sale order for legal compliance and audit purposes

## Support

For issues or questions, please contact your system administrator or refer to the module documentation.
