/** @odoo-module **/

import publicWidget from "@web/legacy/js/public/public_widget";

publicWidget.registry.TOSCartInject = publicWidget.Widget.extend({
    selector: '.oe_website_sale',
    events: {},

    /**
     * @override
     */
    start: function () {
        var self = this;

        // Inject TOS block after page loads
        this._injectTOSBlock();
        
        // Initialize payment page TOS functionality if on payment page
        if (window.location.pathname.includes('/shop/payment')) {
            setTimeout(function() {
                self._initializePaymentPageTOS();
            }, 100);
        }
        
        // Watch for cart changes (handles dynamic cart updates)
        if (window.location.pathname.includes('/shop/cart')) {
            var observer = new MutationObserver(function(mutations) {
                self._removeTOSBlockIfEmpty();
            });
            
            var cartContainer = document.querySelector('#cart_products, .js_cart_lines, .oe_cart');
            if (cartContainer) {
                observer.observe(cartContainer, {
                    childList: true,
                    subtree: true
                });
            }
            
            $(document).on('update_cart.cart', function() {
                setTimeout(function() {
                    if (!self._hasCartProducts()) {
                        self._removeTOSBlockIfEmpty();
                    } else {
                        if (self.$('.oe_website_sale_tos_block').length === 0) {
                            self._injectTOSBlock();
                        }
                    }
                }, 100);
            });
        }
        
        return this._super.apply(this, arguments);
    },

    /**
     * Check if cart has products (simplified logic)
     */
    _hasCartProducts: function () {
        // Check for visible cart lines (exclude empty cart messages)
        var $cartLines = this.$('#cart_products tbody tr:visible, .js_cart_lines tbody tr:visible, .oe_cart tbody tr:visible');
        var hasVisibleLines = $cartLines.filter(function() {
            var $line = $(this);
            return !$line.hasClass('empty-cart') && 
                   !$line.closest('.empty-cart').length &&
                   !$line.text().toLowerCase().includes('your cart is empty') &&
                   !$line.text().toLowerCase().includes('no products');
        }).length > 0;
        
        // Check for explicit empty cart messages
        var $emptyCart = this.$('.empty-cart, .oe_cart_empty, .cart-empty');
        var hasEmptyCartMessage = $emptyCart.length > 0 && 
            ($emptyCart.first().text().toLowerCase().includes('empty') || 
             $emptyCart.first().text().toLowerCase().includes('no products'));
        
        // Return false only if we're certain the cart is empty
        if (hasEmptyCartMessage && !hasVisibleLines) {
            return false;
        }
        
        // Default to true (server will validate)
        return hasVisibleLines || !hasEmptyCartMessage;
    },

    /**
     * Inject the TOS block into the cart page
     */
    _injectTOSBlock: function () {
        var self = this;
        
        // Only inject on cart page
        if (!window.location.pathname.includes('/shop/cart')) {
            return;
        }
        
        // Check if cart has products (server will also validate)
        if (!this._hasCartProducts()) {
            return;
        }
        
        // Check if already injected
        if (this.$('.oe_website_sale_tos_block').length > 0) {
            return;
        }
        
        // Find injection target - prioritize checkout button for proper placement
        var $checkoutButton = this.$('a[name="website_sale_main_button"]').first();
        var $target = null;
        var position = 'before';
        
        if ($checkoutButton.length) {
            $target = $checkoutButton;
            position = 'before';
        } else {
            // Fallback to other targets
            $target = this.$('#o_cart_summary').first();
            if (!$target.length) {
                $target = this.$('.o_total_card, .o_wsale_cart_summary').first();
            }
            if (!$target.length) {
                $target = this.$('a[href*="/shop/checkout"]').first();
            }
            if (!$target.length) {
                $target = this.$('#cart_products, .js_cart_lines').first();
                position = 'after';
            }
            if (!$target.length) {
                $target = this.$('.oe_cart, .container').first();
                position = 'inside';
            }
        }
        
        if (!$target || !$target.length) {
            return;
        }
        
        // Fetch TOS block from server
        fetch('/shop/cart/get_tos_block')
            .then(function (response) {
                if (!response.ok) {
                    return '';
                }
                return response.text();
            })
            .then(function (html) {
                if (!html || !html.trim()) {
                    return;
                }
                
                var $tosBlock = $(html);
                
                // Inject based on position
                if (position === 'before') {
                    $target.before($tosBlock);
                } else if (position === 'after') {
                    $target.after($tosBlock);
                } else {
                    $target.append($tosBlock);
                }
                
                // Initialize functionality
                self._resetTOSCheckboxes();
                self._initializeTOSFunctionality();
            })
            .catch(function (error) {
                // Silently fail - server-side validation will handle
            });
    },

    /**
     * Remove TOS block if cart is empty
     */
    _removeTOSBlockIfEmpty: function () {
        if (!this._hasCartProducts()) {
            var $tosBlock = this.$('.oe_website_sale_tos_block');
            if ($tosBlock.length) {
                $tosBlock.remove();
            }
        }
    },

    /**
     * Reset TOS checkboxes to unchecked state
     */
    _resetTOSCheckboxes: function () {
        $('#tos_accepted_cart, #tos_accepted').prop('checked', false);
        
        // Disable checkout buttons if cart checkbox exists
        var $tosCheckbox = $('#tos_accepted_cart');
        if ($tosCheckbox.length) {
            $('a[href*="/shop/checkout"], a[href*="/shop/payment"]').each(function() {
                var $btn = $(this);
                $btn.addClass('disabled').attr('disabled', 'disabled');
                if ($btn.is('a')) {
                    $btn.css({'pointer-events': 'none', 'opacity': '0.5'});
                }
            });
        }
        
        // Update payment button state
        var $paymentTosCheckbox = $('#tos_accepted');
        if ($paymentTosCheckbox.length) {
            this._updatePaymentButtonState(false);
        }
    },
    
    /**
     * Update Pay now button state based on TOS checkbox
     */
    _updatePaymentButtonState: function (isChecked) {
        var $payButton = $('button[name="o_payment_submit_button"], button[type="submit"][name*="payment"]');
        
        if ($payButton.length) {
            if (isChecked) {
                $payButton.prop('disabled', false).removeClass('disabled')
                    .css({'pointer-events': 'auto', 'opacity': '1', 'cursor': 'pointer'});
            } else {
                $payButton.prop('disabled', true).addClass('disabled')
                    .css({'pointer-events': 'none', 'opacity': '0.5', 'cursor': 'not-allowed'});
            }
        }
    },

    /**
     * Initialize TOS checkbox functionality
     */
    _initializeTOSFunctionality: function () {
        var self = this;
        var $tosBlock = $('.oe_website_sale_tos_block');
        var hasCheckbox = $tosBlock.length > 0;
        
        if (!hasCheckbox) {
            return;
        }
        
        var checkoutButtons = $('a[href*="/shop/checkout"], a[href*="/shop/payment"], button[name="website_sale_main_button"]');
        if (!checkoutButtons.length) {
            return;
        }
        
        // Handle cart checkbox
        var $tosCheckbox = $('#tos_accepted_cart');
        if ($tosCheckbox.length) {
            function updateCheckoutButtons() {
                var isChecked = $tosCheckbox.is(':checked');
                checkoutButtons.each(function () {
                    var $btn = $(this);
                    if (isChecked) {
                        $btn.removeClass('disabled').removeAttr('disabled');
                        if ($btn.is('a')) {
                            $btn.css({ 'pointer-events': 'auto', 'opacity': '1' });
                        }
                    } else {
                        $btn.addClass('disabled').attr('disabled', 'disabled');
                        if ($btn.is('a')) {
                            $btn.css({ 'pointer-events': 'none', 'opacity': '0.5' });
                        }
                    }
                });
            }
            updateCheckoutButtons();
            $tosCheckbox.off('change.tos').on('change.tos', updateCheckoutButtons);
            checkoutButtons.off('click.tos').on('click.tos', function (e) {
                if (!$tosCheckbox.is(':checked')) {
                    e.preventDefault();
                    e.stopPropagation();
                    $tosCheckbox.focus();
                    return false;
                }
            });
        }
        
        // Handle payment page TOS checkbox
        var $paymentTosCheckbox = $('#tos_accepted');
        if ($paymentTosCheckbox.length && !$paymentTosCheckbox.is('#tos_accepted_cart')) {
            function updatePaymentButton() {
                var isChecked = $paymentTosCheckbox.is(':checked');
                self._updatePaymentButtonState(isChecked);
            }
            
            updatePaymentButton();
            $paymentTosCheckbox.off('change.tos-payment').on('change.tos-payment', updatePaymentButton);
            
            var $paymentForm = $('#o_payment_form, form[name="payment"]');
            if ($paymentForm.length) {
                $paymentForm.off('submit.tos-payment').on('submit.tos-payment', function(e) {
                    if (!$paymentTosCheckbox.is(':checked')) {
                        e.preventDefault();
                        e.stopPropagation();
                        $paymentTosCheckbox.focus();
                        $paymentTosCheckbox.closest('.form-check').addClass('border border-danger rounded p-2');
                        setTimeout(function() {
                            $paymentTosCheckbox.closest('.form-check').removeClass('border border-danger rounded p-2');
                        }, 2000);
                        return false;
                    }
                });
            }
        }
    },

    /**
     * Initialize payment page TOS functionality
     */
    _initializePaymentPageTOS: function () {
        var self = this;
        var $paymentTosCheckbox = $('#tos_accepted');
        
        if ($paymentTosCheckbox.length) {
            this._updatePaymentButtonState($paymentTosCheckbox.is(':checked'));
            
            $paymentTosCheckbox.off('change.tos-payment-init').on('change.tos-payment-init', function() {
                self._updatePaymentButtonState($(this).is(':checked'));
            });
            
            var $paymentForm = $('#o_payment_form, form[name="payment"]');
            if ($paymentForm.length) {
                $paymentForm.off('submit.tos-payment-init').on('submit.tos-payment-init', function(e) {
                    if (!$paymentTosCheckbox.is(':checked')) {
                        e.preventDefault();
                        e.stopPropagation();
                        $paymentTosCheckbox.focus();
                        var $formCheck = $paymentTosCheckbox.closest('.form-check');
                        $formCheck.addClass('border border-danger rounded p-2');
                        setTimeout(function() {
                            $formCheck.removeClass('border border-danger rounded p-2');
                        }, 2000);
                        return false;
                    }
                });
            }
        }
    },
});
