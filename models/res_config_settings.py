# -*- coding: utf-8 -*-

from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    tos_enabled = fields.Boolean(
        string="Enable Terms of Service",
        config_parameter="website_sale_checkout_tos.tos_enabled",
        default=False,
        help="Enable the acknowledgment checkbox at checkout. Customers acknowledge they will sign final terms with the sales quote.",
    )

    tos_version = fields.Char(
        string="TOS Version",
        config_parameter="website_sale_checkout_tos.tos_version",
        default="v1.0",
        help="Version identifier for the Terms of Service acknowledgment (e.g., 'v1.0', '2025-11-24'). This is stored with each order acceptance.",
    )
