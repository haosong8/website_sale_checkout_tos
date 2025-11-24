# -*- coding: utf-8 -*-

from odoo import http, fields, _
from odoo.http import request
from odoo.addons.website_sale.controllers.main import WebsiteSale
from odoo.exceptions import UserError


class WebsiteSaleTOS(WebsiteSale):
    """Extend WebsiteSale to add Terms of Service enforcement at checkout."""

    def _is_tos_enabled(self):
        """Check if TOS functionality is enabled."""
        return request.env["ir.config_parameter"].sudo().get_param(
            "website_sale_checkout_tos.tos_enabled", "False"
        ) == "True"

    def _get_tos_config(self):
        """Get TOS configuration values."""
        ICP = request.env["ir.config_parameter"].sudo()
        return {
            "tos_enabled": self._is_tos_enabled(),
            "tos_title": ICP.get_param("website_sale_checkout_tos.tos_title", "Terms & Conditions"),
            "tos_content": ICP.get_param("website_sale_checkout_tos.tos_content", ""),
            "tos_version": ICP.get_param("website_sale_checkout_tos.tos_version", "v1.0"),
            "tos_show_modal": ICP.get_param("website_sale_checkout_tos.tos_show_modal", "True") == "True",
        }

    @http.route(["/shop/tos"], type="http", auth="public", website=True)
    def tos_page(self, **kwargs):
        """Display TOS content in a dedicated page."""
        tos_config = self._get_tos_config()
        values = {
            "tos_title": tos_config["tos_title"],
            "tos_content": tos_config["tos_content"],
        }
        return request.render("website_sale_checkout_tos.tos_page", values)

    def _get_shop_payment_values(self, order, **post):
        """Override to add TOS config to payment page values."""
        if hasattr(super(), '_get_shop_payment_values'):
            values = super()._get_shop_payment_values(order, **post)
        else:
            values = {}
        
        # Always add TOS config to values (even if disabled, so template can check)
        tos_config = self._get_tos_config()
        values.update(tos_config)
        
        # Add error message if present
        if 'tos_error' in request.session:
            values['tos_error'] = request.session.get('tos_error')
        
        return values

    @http.route()
    def payment(self, **post):
        """Override payment route to pass TOS config to template."""
        response = super().payment(**post)
        
        # Always add TOS config to context (even if disabled)
        tos_config = self._get_tos_config()
        
        # If response is a Response object, modify the qcontext
        if hasattr(response, 'qcontext'):
            response.qcontext.update(tos_config)
        
        # Also add error message if present
        if 'tos_error' in request.session and hasattr(response, 'qcontext'):
            response.qcontext['tos_error'] = request.session.get('tos_error')
        
        return response

    @http.route()
    def payment_transaction(self, **post):
        """Override payment_transaction to validate TOS acceptance."""
        order = request.website.sale_get_order(force_create=False)
        if not order:
            return request.redirect("/shop/cart")

        # Validate TOS acceptance if enabled
        if self._is_tos_enabled():
            tos_accepted = post.get("tos_accepted")
            
            # Check if checkbox was checked (can be "on", "true", "1", or True)
            is_accepted = (
                tos_accepted in ("on", "true", "1", True) or
                (isinstance(tos_accepted, bool) and tos_accepted)
            )
            
            if not is_accepted:
                # Re-render payment page with error
                error_msg = _("You must agree to the Terms & Conditions to place your order.")
                # Get TOS config for template
                tos_config = self._get_tos_config()
                values = {
                    "error": error_msg,
                    **tos_config,
                }
                # Try to get existing payment page values
                try:
                    payment_response = super().payment(**post)
                    if hasattr(payment_response, 'qcontext'):
                        payment_response.qcontext.update(values)
                        return payment_response
                except Exception:
                    pass
                
                # Fallback: redirect to payment page with error in session
                request.session['tos_error'] = error_msg
                return request.redirect("/shop/payment")

            # TOS accepted - store acceptance on order
            tos_config = self._get_tos_config()
            order.write({
                "tos_accepted": True,
                "tos_accepted_on": fields.Datetime.now(),
                "tos_version": tos_config["tos_version"],
            })
            order.message_post(
                body=_("Customer accepted Terms of Service (Version: %s) at checkout.") % tos_config["tos_version"]
            )

        # Clear any previous error
        if 'tos_error' in request.session:
            del request.session['tos_error']

        # Call parent to create transaction
        return super().payment_transaction(**post)

    @http.route()
    def checkout(self, **post):
        """Override checkout to pass TOS config to template."""
        response = super().checkout(**post)
        
        # Add TOS config to context if TOS is enabled
        if self._is_tos_enabled():
            tos_config = self._get_tos_config()
            if hasattr(response, 'qcontext'):
                response.qcontext.update(tos_config)
        
        return response

