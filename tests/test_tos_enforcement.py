# -*- coding: utf-8 -*-

from odoo.addons.website.tools import MockRequest
from odoo.tests import SavepointCase, tagged

from odoo.addons.website_sale_checkout_tos.controllers.website_sale import WebsiteSaleTOS


@tagged("post_install", "-at_install")
class TestTosEnforcement(SavepointCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.website = cls.env["website"].search([], limit=1)
        cls.partner = cls.env["res.partner"].create({"name": "TOS Test Customer"})
        cls.icp = cls.env["ir.config_parameter"].sudo()
        cls.icp.set_param("website_sale_checkout_tos.tos_enabled", "True")
        cls.icp.set_param("website_sale_checkout_tos.tos_version", "vTest")

    def _create_order(self):
        """Create a bare-bones sale order attached to the website."""
        pricelist = self.website.pricelist_id
        return (
            self.env["sale.order"]
            .with_context(website_id=self.website.id)
            .create(
                {
                    "partner_id": self.partner.id,
                    "website_id": self.website.id,
                    "pricelist_id": pricelist.id,
                }
            )
        )

    def test_is_tos_enabled_handles_truthy_strings(self):
        """Boolean cast must accept common truthy string values."""
        controller = WebsiteSaleTOS()
        for truthy in ("True", "true", "1", True):
            self.icp.set_param("website_sale_checkout_tos.tos_enabled", truthy)
            with MockRequest(self.env, website=self.website):
                self.assertTrue(controller._is_tos_enabled())
        self.icp.set_param("website_sale_checkout_tos.tos_enabled", "False")
        with MockRequest(self.env, website=self.website):
            self.assertFalse(controller._is_tos_enabled())

    def test_checkout_rejects_when_tos_missing(self):
        """Missing checkbox should redirect back to cart and keep order clean."""
        order = self._create_order()
        controller = WebsiteSaleTOS()
        with MockRequest(self.env, website=self.website) as mr:
            # Force the controller to use our prepared order
            mr.website.sale_get_order = lambda force_create=False: order
            response = controller.checkout()
            self.assertEqual(response.location, "/shop/cart")
            self.assertIn("tos_error", mr.session)
            self.assertFalse(order.tos_accepted)
            self.assertFalse(order.tos_accepted_on)
            self.assertFalse(order.tos_version)

    def test_checkout_records_acceptance(self):
        """Accepted checkbox should persist acceptance on the order."""
        order = self._create_order()
        controller = WebsiteSaleTOS()
        with MockRequest(self.env, website=self.website) as mr:
            mr.website.sale_get_order = lambda force_create=False: order
            controller.checkout(tos_accepted="true")
        self.assertTrue(order.tos_accepted)
        self.assertTrue(order.tos_accepted_on)
        self.assertEqual(order.tos_version, "vTest")
