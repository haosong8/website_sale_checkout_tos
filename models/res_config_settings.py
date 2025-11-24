# -*- coding: utf-8 -*-

from odoo import models, fields


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    tos_enabled = fields.Boolean(
        string="Enable Terms of Service",
        config_parameter="website_sale_checkout_tos.tos_enabled",
        default=False,
        help="Enable Terms of Service enforcement at checkout. If disabled, TOS checkbox will not be shown.",
    )

    tos_title = fields.Char(
        string="TOS Title",
        config_parameter="website_sale_checkout_tos.tos_title",
        default="Terms & Conditions",
        help="Title displayed for the Terms of Service (e.g., 'Terms & Conditions', 'Terms of Service').",
    )

    tos_content = fields.Html(
        string="TOS Content",
        config_parameter="website_sale_checkout_tos.tos_content",
        help="Full Terms of Service text displayed in modal or dedicated page. HTML formatting is supported.",
    )

    tos_version = fields.Char(
        string="TOS Version",
        config_parameter="website_sale_checkout_tos.tos_version",
        default="v1.0",
        help="Version identifier for the Terms of Service (e.g., 'v1.0', '2025-11-24'). This is stored with each order acceptance.",
    )

    tos_show_modal = fields.Boolean(
        string="Show TOS in Modal",
        config_parameter="website_sale_checkout_tos.tos_show_modal",
        default=True,
        help="If enabled, TOS content is displayed in a modal popup. If disabled, TOS opens in a dedicated page.",
    )

