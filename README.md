# Website Sale Checkout Terms of Service

## Overview

This module adds a Terms of Service acknowledgment step to the Odoo 18 website checkout flow. Customers must acknowledge that they will sign the final terms and conditions with the sales quote before proceeding to checkout. The acknowledgment is stored on the sale order with timestamp and version for audit purposes.

## Features

- **Simple Acknowledgment**: Customers check a box to acknowledge they will sign final terms with the sales quote
- **Enforcement**: Controller-side validation ensures acknowledgment cannot be bypassed
- **Audit Trail**: Acknowledgment is stored on sale orders with timestamp and version
- **Reusable**: Works across all ecommerce products (windows, flooring, etc.)

## Installation

1. Copy this module to your Odoo addons directory
2. Update the apps list in Odoo
3. Install "Website Sale Checkout Terms of Service"

## Configuration

1. Go to **Website → Configuration → Settings**
2. Scroll to the **"Checkout Terms & Conditions"** section
3. Configure the following:
   - **Enable Terms of Service**: Toggle to enable/disable the acknowledgment checkbox
   - **TOS Version**: Version identifier (e.g., "v1.0", "2025-11-24")

## Usage

### For Customers

1. On the cart page, customers see a checkbox above the checkout button
2. The checkbox states: "I acknowledge that I will sign the final terms and conditions with the sales quote."
3. Customers must check the box before proceeding to checkout
4. The checkout button is disabled until the checkbox is checked
5. Final terms and conditions are signed with the sales quote (not displayed at checkout)

### For Administrators

- View TOS acknowledgment status on sale orders:
  - **TOS Accepted**: Boolean field indicating acknowledgment
  - **TOS Accepted On**: Timestamp of acknowledgment
  - **TOS Version**: Version of TOS that was acknowledged
- TOS acknowledgment is logged in the order's message history

## Technical Details

### Models Extended

- `res.config.settings`: Added TOS configuration fields (enabled, version)
- `sale.order`: Added `tos_accepted`, `tos_accepted_on`, and `tos_version` fields

### Controllers

- `website_sale`: Extended to validate TOS acknowledgment and store acknowledgment data

### Views

- Settings form: Added "Checkout Terms & Conditions" section
- Sale order form: Added TOS fields for auditability
- Payment page: Added TOS checkbox
- Cart page: TOS checkbox injected via JavaScript

## Security

- TOS fields on sale orders are read-only for standard users (managers can edit)
- Configuration is restricted to system administrators
- Controller validation prevents bypassing TOS acknowledgment

## Integration with Other Modules

This module is designed to work alongside other ecommerce modules:

- **Window Order Status**: TOS acknowledgment can be viewed in order status views
- **Window Website Deposit**: TOS acknowledgment is required before deposit payment
- Works with any product type (windows, flooring, etc.)

## Support

For issues or questions, please contact your system administrator or refer to the module documentation.
