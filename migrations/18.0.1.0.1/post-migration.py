# -*- coding: utf-8 -*-

def migrate(cr, version):
    """
    Migration script to clean up old TOS content configuration.
    
    Removes:
    - website_sale_checkout_tos.tos_content config parameter
    - website_sale_checkout_tos.tos_title config parameter (if exists)
    - website_sale_checkout_tos.tos_show_modal config parameter (if exists)
    - website_sale_checkout_tos.tos_checkout_dialog config parameter (if exists)
    """
    cr.execute("""
        DELETE FROM ir_config_parameter
        WHERE key IN (
            'website_sale_checkout_tos.tos_content',
            'website_sale_checkout_tos.tos_title',
            'website_sale_checkout_tos.tos_show_modal',
            'website_sale_checkout_tos.tos_checkout_dialog'
        )
    """)

