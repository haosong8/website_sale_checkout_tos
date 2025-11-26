# -*- coding: utf-8 -*-
{
    'name': 'Website Sale Checkout Terms of Service',
    'version': '18.0.1.0.1',
    'category': 'Website',
    'summary': 'Add configurable Terms of Service agreement to website checkout',
    'description': """
Website Sale Checkout Terms of Service
======================================
This module adds a Terms of Service acknowledgment step to the Odoo 18 website checkout flow:

* Customers must acknowledge that they will sign final terms with the sales quote
* Acknowledgment is stored on the sale order with timestamp and version
* Controller-side validation ensures acknowledgment cannot be bypassed
* Final terms and conditions are signed with the sales quote (not displayed at checkout)
    """,
    'author': 'Your Company',
    'website': 'https://www.yourcompany.com',
    'depends': [
        'sale',
        'website_sale',
    ],
    'data': [
        'security/ir.model.access.csv',
        'views/res_config_settings_views.xml',
        'views/sale_order_views.xml',
        'views/website_templates.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'website_sale_checkout_tos/static/src/js/tos_cart_inject.js',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}
