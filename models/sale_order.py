# -*- coding: utf-8 -*-

from odoo import fields, models


class SaleOrder(models.Model):
    _inherit = "sale.order"

    tos_accepted = fields.Boolean(
        string="TOS Accepted",
        default=False,
        readonly=True,
        help="Indicates that the customer has accepted the Terms of Service at checkout.",
    )

    tos_accepted_on = fields.Datetime(
        string="TOS Accepted On",
        readonly=True,
        help="Date and time when the customer accepted the Terms of Service.",
    )

    tos_version = fields.Char(
        string="TOS Version",
        readonly=True,
        help="Version of the Terms of Service that was accepted by the customer.",
    )



