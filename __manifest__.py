# -*- coding: utf-8 -*-
{
    'name': 'Website Sale Checkout Terms of Service',
    'version': '18.0.1.0.0',
    'category': 'Website',
    'summary': 'Add configurable Terms of Service agreement to website checkout',
    'description': """
Website Sale Checkout Terms of Service
======================================
This module adds a reusable, configurable Terms of Service (TOS) agreement step 
to the Odoo 18 website checkout flow:

* Customers must explicitly accept TOS before placing an order / paying a deposit
* TOS acceptance is stored on the sale order with timestamp and version
* TOS text is managed from backend settings and can be reused across any ecommerce products
* Supports both modal popup and dedicated page display modes
* Controller-side validation ensures TOS acceptance cannot be bypassed
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
            'website_sale_checkout_tos/static/src/scss/tos_modal.scss',
            'website_sale_checkout_tos/static/src/js/tos_cart_inject.js',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}



