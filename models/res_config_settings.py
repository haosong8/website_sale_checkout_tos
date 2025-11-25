# -*- coding: utf-8 -*-

from odoo import models, fields


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    tos_enabled = fields.Boolean(
        string="Enable Terms of Service",
        config_parameter="website_sale_checkout_tos.tos_enabled",
        default=False,
        help="Enable the Review & Accept flow at checkout. If disabled, the dialog and buttons are hidden.",
    )

    tos_title = fields.Char(
        string="TOS Title",
        config_parameter="website_sale_checkout_tos.tos_title",
        default="Terms & Conditions",
        help="Title displayed for the Terms of Service (e.g., 'Terms & Conditions', 'Terms of Service').",
    )

    tos_content = fields.Html(
        string="TOS Content",
        help="Full Terms of Service text displayed inside the review dialog. HTML formatting is supported.",
    )

    tos_version = fields.Char(
        string="TOS Version",
        config_parameter="website_sale_checkout_tos.tos_version",
        default="v1.0",
        help="Version identifier for the Terms of Service (e.g., 'v1.0', '2025-11-24'). This is stored with each order acceptance.",
    )

    def get_values(self):
        res = super().get_values()
        ICP = self.env["ir.config_parameter"].sudo()
        res.update(
            tos_content=ICP.get_param("website_sale_checkout_tos.tos_content", ""),
        )
        return res

    def set_values(self):
        super().set_values()
        ICP = self.env["ir.config_parameter"].sudo()
        ICP.set_param("website_sale_checkout_tos.tos_content", self.tos_content or "")
