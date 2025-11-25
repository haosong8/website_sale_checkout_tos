# -*- coding: utf-8 -*-

from odoo import http, fields, _, tools
from odoo.http import request
from odoo.addons.website_sale.controllers.main import WebsiteSale


class WebsiteSaleTOS(WebsiteSale):
    """Extend WebsiteSale to add Terms of Service enforcement at checkout."""

    def _is_tos_enabled(self):
        """Check if TOS functionality is enabled."""
        ICP = request.env["ir.config_parameter"].sudo()
        raw_value = ICP.get_param("website_sale_checkout_tos.tos_enabled", default="False")
        return tools.str2bool(str(raw_value))

    def _get_tos_config(self):
        """Get TOS configuration values."""
        ICP = request.env["ir.config_parameter"].sudo()
        return {
            "tos_enabled": self._is_tos_enabled(),
            "tos_version": ICP.get_param("website_sale_checkout_tos.tos_version", "v1.0"),
        }

    @http.route(["/shop/tos"], type="http", auth="public", website=True)
    def tos_page(self, **kwargs):
        """Redirect to cart - TOS content is no longer displayed."""
        return request.redirect("/shop/cart")

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
                error_msg = _("You must acknowledge that you will sign the final terms with the sales quote.")
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
                body=_("Customer acknowledged Terms of Service (Version: %s) at checkout.") % tos_config["tos_version"]
            )

        # Clear any previous error
        if 'tos_error' in request.session:
            del request.session['tos_error']

        # Call parent to create transaction
        return super().payment_transaction(**post)

    @http.route()
    def cart(self, **post):
        """Override cart to pass TOS config to template."""
        response = super().cart(**post)
        
        # Add TOS config to context if TOS is enabled
        if self._is_tos_enabled():
            tos_config = self._get_tos_config()
            if hasattr(response, 'qcontext'):
                response.qcontext.update(tos_config)
        
        return response

    @http.route()
    def checkout(self, **post):
        """Override checkout to validate TOS acceptance."""
        order = request.website.sale_get_order(force_create=False)
        
        # Validate TOS acceptance if enabled
        if self._is_tos_enabled() and order:
            tos_accepted = post.get("tos_accepted")
            is_accepted = (
                tos_accepted in ("on", "true", "1", True) or
                (isinstance(tos_accepted, bool) and tos_accepted)
            )
            
            if not is_accepted:
                request.session['tos_error'] = _("You must acknowledge that you will sign the final terms with the sales quote.")
                return request.redirect("/shop/cart")
            
            # Store acceptance
            if is_accepted and not order.tos_accepted:
                tos_config = self._get_tos_config()
                order.write({
                    "tos_accepted": True,
                    "tos_accepted_on": fields.Datetime.now(),
                    "tos_version": tos_config["tos_version"],
                })
                order.message_post(
                    body=_("Customer acknowledged Terms of Service (Version: %s) at checkout.") % tos_config["tos_version"]
                )
        
        response = super().checkout(**post)
        
        # Add TOS config to context if TOS is enabled
        if self._is_tos_enabled():
            tos_config = self._get_tos_config()
            if hasattr(response, 'qcontext'):
                response.qcontext.update(tos_config)
        
        return response

    @http.route(
        "/shop/cart/get_tos_block",
        type="http",
        auth="public",
        website=True,
        methods=["GET"],
    )
    def get_tos_block(self, **kw):
        """Return the TOS block HTML for JavaScript injection."""
        # Check if TOS is enabled
        if not self._is_tos_enabled():
            return request.make_response("")
        
        # Check if cart has products
        order = request.website.sale_get_order(force_create=False)
        if not order or not order.order_line:
            return request.make_response("")
        
        # Get TOS config and render the template
        try:
            tos_config = self._get_tos_config()
            html = request.env["ir.ui.view"]._render_template(
                "website_sale_checkout_tos.tos_cart_block",
                values=tos_config
            )
            return html
        except Exception:
            return request.make_response("")
