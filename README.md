# Website Sale Checkout Terms of Service

## Overview

This module adds a reusable, configurable Terms of Service (TOS) agreement step to the Odoo 18 website checkout flow. Customers must explicitly accept the TOS before placing an order or paying a deposit, and the acceptance is stored on the sale order with timestamp and version.

## Features

- **Configurable TOS**: Manage TOS content, title, and version from Website Settings
- **Two-Step Dialog**: Customers click *Review & Accept*, read the dialog, tick the checkbox, then continue to checkout
- **Enforcement**: Controller-side validation ensures TOS acceptance cannot be bypassed
- **Audit Trail**: TOS acceptance is stored on sale orders with timestamp and version
- **Reusable**: Works across all ecommerce products (windows, flooring, etc.)

## Installation

1. Copy this module to your Odoo addons directory
2. Update the apps list in Odoo
3. Install "Website Sale Checkout Terms of Service"

## Configuration

1. Go to **Website → Configuration → Settings**
2. Scroll to the **"Checkout Terms & Conditions"** section
3. Configure the following:
   - **Enable Terms of Service**: Toggle to enable/disable the review dialog
   - **TOS Title**: Title displayed for the Terms of Service (e.g., "Terms & Conditions")
   - **TOS Content**: Full TOS text with HTML formatting support
   - **TOS Version**: Version identifier (e.g., "v1.0", "2025-11-24")

## Usage

### For Customers

1. On the cart summary the customer clicks **Review & Accept Terms**
2. The dialog opens with the full terms; they tick the checkbox and click **Accept & Continue**
3. The flow automatically redirects them to checkout/payment with proof of acceptance
4. Orders cannot be placed without completing the dialog

### For Administrators

- View TOS acceptance status on sale orders:
  - **TOS Accepted**: Boolean field indicating acceptance
  - **TOS Accepted On**: Timestamp of acceptance
  - **TOS Version**: Version of TOS that was accepted
- TOS acceptance is logged in the order's message history

## Technical Details

### Models Extended

- `res.config.settings`: Added TOS configuration fields
- `sale.order`: Added `tos_accepted`, `tos_accepted_on`, and `tos_version` fields

### Controllers

- `website_sale`: Extended to validate TOS acceptance and store acceptance data

### Views

- Settings form: Added "Checkout Terms & Conditions" section
- Sale order form: Added TOS fields for auditability
- Payment page: Added TOS checkbox and modal/page integration

## Security

- TOS fields on sale orders are read-only for standard users
- Configuration is restricted to system administrators
- Controller validation prevents bypassing TOS acceptance

## Integration with Other Modules

This module is designed to work alongside other ecommerce modules:

- **Window Order Status**: TOS acceptance can be viewed in order status views
- **Window Website Deposit**: TOS acceptance is required before deposit payment
- Works with any product type (windows, flooring, etc.)

## Support

For issues or questions, please contact your system administrator or refer to the module documentation.



