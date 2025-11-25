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
        
        // Make sure dialog mode logic is wired up immediately
        this._initializeTOSFunctionality();
        this._initializeTOSModal();

        // Inject TOS block after page loads (adds checkbox markup when needed)
        this._injectTOSBlock();
        
        // Initialize payment page TOS functionality if on payment page
        if (window.location.pathname.includes('/shop/payment')) {
            // Wait a bit for page to fully load
            setTimeout(function() {
                self._initializePaymentPageTOS();
            }, 100);
        }
        
        // Check periodically if cart becomes empty and remove TOS block
        // This handles dynamic cart updates (AJAX)
        if (window.location.pathname.includes('/shop/cart')) {
            // Use MutationObserver to watch for cart changes
            var observer = new MutationObserver(function(mutations) {
                self._removeTOSBlockIfEmpty();
            });
            
            // Observe cart container for changes
            var cartContainer = document.querySelector('#cart_products, .js_cart_lines, .oe_cart');
            if (cartContainer) {
                observer.observe(cartContainer, {
                    childList: true,
                    subtree: true
                });
            }
            
            // Also listen for cart update events
            $(document).on('update_cart.cart', function() {
                setTimeout(function() {
                    if (!self._hasCartProducts()) {
                        self._removeTOSBlockIfEmpty();
                    } else {
                        // Re-inject if cart now has products
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
     * Check if cart has products
     */
    _hasCartProducts: function () {
        // Multiple ways to detect cart products - be more lenient
        
        // 1. Check for cart line elements (various selectors)
        var $cartLines = this.$('#cart_products tbody tr, .js_cart_lines tbody tr, .oe_cart tbody tr, .cart_line, .js_cart_line, table.js_cart_lines tr, .o_cart_summary, .o_wsale_cart_summary');
        
        // 2. Check for product-related elements in cart
        var $productElements = this.$('.js_product, .product-name, .product-image, [data-product-id], .oe_website_sale_product');
        
        // 3. Check for cart quantity indicators
        var $cartQuantity = this.$('.my_cart_quantity, [data-cart-quantity], sup.my_cart_quantity');
        var cartQuantity = 0;
        
        if ($cartQuantity.length) {
            var quantityText = $cartQuantity.first().text().trim();
            cartQuantity = parseInt(quantityText) || 0;
        }
        
        // 4. Check for checkout buttons (usually only present when cart has items)
        var $checkoutButtons = this.$('a[href*="/shop/checkout"], a[href*="/shop/payment"], button[name="website_sale_main_button"]');
        
        // 5. Check for cart total/summary (indicates cart has items)
        var $cartTotal = this.$('.o_cart_summary, .o_total_card, .o_wsale_cart_summary, [class*="cart-summary"], [class*="total"]');
        
        // 6. Check for quantity inputs (product quantity selectors)
        var $quantityInputs = this.$('input[type="number"][name*="quantity"], .js_quantity input, input.js_quantity');
        
        // 7. Check for remove/delete buttons (indicates cart items)
        var $removeButtons = this.$('a[href*="/shop/cart/update"], .js_delete_product, [data-delete-product]');
        
        // Check if there are visible cart lines (not empty cart messages)
        var hasVisibleLines = $cartLines.filter(function() {
            var $line = $(this);
            // Exclude empty cart messages or hidden lines
            return $line.is(':visible') && 
                   !$line.hasClass('empty-cart') && 
                   !$line.closest('.empty-cart').length &&
                   !$line.text().toLowerCase().includes('your cart is empty') &&
                   !$line.text().toLowerCase().includes('no products');
        }).length > 0;
        
        // Check for explicit empty cart messages
        var $emptyCart = this.$('.empty-cart, .oe_cart_empty, .cart-empty, [class*="empty-cart"]');
        var hasEmptyCartMessage = false;
        
        if ($emptyCart.length > 0) {
            var emptyCartText = $emptyCart.first().text().toLowerCase();
            hasEmptyCartMessage = emptyCartText.includes('empty') || 
                                 emptyCartText.includes('no products') ||
                                 emptyCartText.includes('add products');
        }
        
        // Positive indicators that cart has products
        var positiveIndicators = 0;
        if (hasVisibleLines) positiveIndicators++;
        if ($productElements.length > 0) positiveIndicators++;
        if (cartQuantity > 0) positiveIndicators++;
        if ($checkoutButtons.length > 0) positiveIndicators++;
        if ($cartTotal.length > 0) positiveIndicators++;
        if ($quantityInputs.length > 0) positiveIndicators++;
        if ($removeButtons.length > 0) positiveIndicators++;
        
        // If we have multiple positive indicators, cart likely has products
        // If we have explicit empty cart message AND no positive indicators, cart is empty
        // Otherwise, default to assuming cart has products (to avoid false negatives)
        // Server-side will also validate, so we err on the side of showing TOS
        var hasProducts = true; // Default to true (lenient approach)
        
        // Only return false if we're CERTAIN the cart is empty
        if (hasEmptyCartMessage && positiveIndicators === 0) {
            hasProducts = false;
        }
        // If we have any positive indicators, definitely has products
        else if (positiveIndicators > 0) {
            hasProducts = true;
        }
        // If we can't determine, default to true (server will validate)
        // This prevents false negatives where cart has products but our selectors don't match
        
        console.log('[TOS Cart Inject] Cart check:', {
            cartLines: $cartLines.length,
            visibleLines: hasVisibleLines,
            productElements: $productElements.length,
            cartQuantity: cartQuantity,
            checkoutButtons: $checkoutButtons.length,
            cartTotal: $cartTotal.length,
            quantityInputs: $quantityInputs.length,
            removeButtons: $removeButtons.length,
            positiveIndicators: positiveIndicators,
            hasEmptyCartMessage: hasEmptyCartMessage,
            hasProducts: hasProducts
        });
        
        return hasProducts;
    },

    /**
     * Inject the TOS block into the cart page
     */
    _injectTOSBlock: function () {
        var self = this;
        
        console.log('[TOS Cart Inject] Starting injection process');
        console.log('[TOS Cart Inject] Current URL:', window.location.pathname);
        
        // Check if we're on the cart page
        if (!window.location.pathname.includes('/shop/cart')) {
            console.log('[TOS Cart Inject] Not on cart page, skipping injection');
            return;
        }
        
        // Check if cart has products before injecting
        // Note: Server-side will also validate, so this is just an optimization
        // We'll be lenient here - only skip if we're CERTAIN cart is empty
        var cartCheck = this._hasCartProducts();
        if (cartCheck === false) {
            console.log('[TOS Cart Inject] Cart appears empty, skipping TOS injection (server will also validate)');
            return;
        }
        
        console.log('[TOS Cart Inject] On cart page, looking for injection target...');

        // Try to find a good location to inject - before checkout button or cart summary
        var $cartLines = this.$('#cart_products, .js_cart_lines').first();
        var $cartSummary = this.$('#o_cart_summary, .o_total_card, .o_wsale_cart_summary').first();
        var $checkoutButton = this.$('a[name="website_sale_main_button"], a[href*="/shop/checkout"], a[href*="/shop/payment"]').first();
        
        // Determine target location
        var $target = null;
        var position = 'before';
        
        if ($checkoutButton.length) {
            $target = $checkoutButton;
            position = 'before';
        } else if ($cartSummary.length) {
            $target = $cartSummary;
            position = 'before';
        } else if ($cartLines.length) {
            $target = $cartLines;
            position = 'after';
        } else {
            // Fallback: try to find any container
            $target = this.$('.oe_cart, .container').first();
            position = 'inside';
        }

        console.log('[TOS Cart Inject] Found elements:');
        console.log('  - Cart Lines:', $cartLines.length);
        console.log('  - Cart Summary:', $cartSummary.length);
        console.log('  - Checkout Button:', $checkoutButton.length);
        console.log('  - Target:', $target ? $target.length : 'not found');
        console.log('  - Position:', position);

        if (!$target || !$target.length) {
            console.error('[TOS Cart Inject] Could not find any target element for injection');
            return;
        }

        console.log('[TOS Cart Inject] Target element found, fetching TOS block from server...');

        // Fetch the TOS block HTML from server using fetch API
        // Server will validate that cart has products, so we can rely on that
        fetch('/shop/cart/get_tos_block')
            .then(function (response) {
                console.log('[TOS Cart Inject] Server response status:', response.status, response.statusText);
                if (!response.ok) {
                    console.log('[TOS Cart Inject] Server returned error, cart may be empty or TOS disabled');
                    return '';
                }
                return response.text();
            })
            .then(function (html) {
                console.log('[TOS Cart Inject] Received HTML, length:', html ? html.length : 0);
                // If server returns empty, it means cart is empty or TOS is disabled
                if (!html || !html.trim()) {
                    console.log('[TOS Cart Inject] Server returned empty response - cart may be empty or TOS disabled');
                    return;
                }
                
                if (html && html.trim()) {
                    console.log('[TOS Cart Inject] HTML preview (first 200 chars):', html.substring(0, 200));
                    var $tosBlock = $(html);
                    console.log('[TOS Cart Inject] Parsed HTML into jQuery object, elements:', $tosBlock.length);
                    
                    // Check if TOS block is already injected to avoid duplicates
                    if (self.$('.oe_website_sale_tos_block').length > 0) {
                        console.log('[TOS Cart Inject] TOS block already exists, skipping injection');
                        return;
                    }
                    
                    // Inject into target
                    if (position === 'inside') {
                        $target.append($tosBlock);
                        console.log('[TOS Cart Inject] Successfully injected TOS block INSIDE target');
                    } else if (position === 'before') {
                        $target.before($tosBlock);
                        console.log('[TOS Cart Inject] Successfully injected TOS block BEFORE target');
                    } else {
                        $target.after($tosBlock);
                        console.log('[TOS Cart Inject] Successfully injected TOS block AFTER target');
                    }
                    
                    // Reset TOS checkboxes to unchecked state on page load
                    self._resetTOSCheckboxes();
                    
                    // Initialize TOS functionality after injection
                    self._initializeTOSFunctionality();
                    
                    // Handle TOS modal link clicks (for viewing TOS)
                    self._initializeTOSModal();
                    
                    console.log('[TOS Cart Inject] Injection complete!');
                } else {
                    console.warn('[TOS Cart Inject] Received empty HTML from server - TOS may not be enabled');
                    
                    // Even when nothing was injected (dialog mode), ensure dialog logic is active
                    self._resetTOSCheckboxes();
                    self._initializeTOSFunctionality();
                    self._initializeTOSModal();
                }
            })
            .catch(function (error) {
                console.error('[TOS Cart Inject] Error loading TOS block:', error);
                console.error('[TOS Cart Inject] Error stack:', error.stack);
            });
    },

    /**
     * Remove TOS block if cart is empty
     */
    _removeTOSBlockIfEmpty: function () {
        if (!this._hasCartProducts()) {
            var $tosBlock = this.$('.oe_website_sale_tos_block');
            if ($tosBlock.length) {
                console.log('[TOS Cart Inject] Cart is empty, removing TOS block');
                $tosBlock.remove();
            }
        }
    },

    /**
     * Reset TOS checkboxes to unchecked state
     */
    _resetTOSCheckboxes: function () {
        var $tosCheckbox = $('#tos_accepted_cart');
        if ($tosCheckbox.length) {
            $tosCheckbox.prop('checked', false);
        }
        
        // Also handle payment page checkbox
        var $paymentTosCheckbox = $('#tos_accepted');
        if ($paymentTosCheckbox.length) {
            $paymentTosCheckbox.prop('checked', false);
        }
        
        var $dialogCheckbox = $('#tos_dialog_accepted');
        if ($dialogCheckbox.length) {
            $dialogCheckbox.prop('checked', false);
        }
        
        var $acceptBtn = $('#tos_dialog_accept_btn');
        if ($acceptBtn.length) {
            $acceptBtn.prop('disabled', true);
        }
        
        // Disable buttons based on checkbox state
        if ($tosCheckbox.length) {
            $('a[href*="/shop/checkout"], a[href*="/shop/payment"], button[type="submit"]').each(function() {
                var $btn = $(this);
                $btn.addClass('disabled').attr('disabled', 'disabled');
                if ($btn.is('a')) {
                    $btn.css({'pointer-events': 'none', 'opacity': '0.5'});
                }
            });
        }
        
        // Disable Pay now button on payment page if checkbox is unchecked
        if ($paymentTosCheckbox.length) {
            this._updatePaymentButtonState($paymentTosCheckbox.is(':checked'));
        }
    },
    
    /**
     * Update Pay now button state based on TOS checkbox
     */
    _updatePaymentButtonState: function (isChecked) {
        var $payButton = $('button[name="o_payment_submit_button"], button[type="submit"][name*="payment"]');
        
        if ($payButton.length) {
            if (isChecked) {
                $payButton.prop('disabled', false).removeClass('disabled');
                $payButton.css({'pointer-events': 'auto', 'opacity': '1', 'cursor': 'pointer'});
            } else {
                $payButton.prop('disabled', true).addClass('disabled');
                $payButton.css({'pointer-events': 'none', 'opacity': '0.5', 'cursor': 'not-allowed'});
            }
        }
    },

    /**
     * Initialize TOS checkbox and dialog functionality after injection
     */
    _initializeTOSFunctionality: function () {
        var self = this;
        var $tosDialog = $('#checkout_tos_dialog');
        var hasDialog = $tosDialog.length > 0;
        var $tosBlock = $('.oe_website_sale_tos_block');
        var hasCheckbox = $tosBlock.length > 0;
        
        var tosCheckoutDialog = false;
        if (hasCheckbox) {
            var tosEnabled = $tosBlock.data('tos-enabled') === true ||
                $tosBlock.data('tos-enabled') === 'true' ||
                String($tosBlock.data('tos-enabled')).toLowerCase() === 'true';
            tosCheckoutDialog = $tosBlock.data('tos-checkout-dialog') === true ||
                $tosBlock.data('tos-checkout-dialog') === 'true' ||
                String($tosBlock.data('tos-checkout-dialog')).toLowerCase() === 'true';
            if (!tosEnabled && !hasDialog) {
                return;
            }
        } else if (!hasDialog) {
            return;
        } else {
            tosCheckoutDialog = true;
        }
        
        var checkoutButtons = $('a[href*="/shop/checkout"], a[href*="/shop/payment"], button[name="website_sale_main_button"], button[data-action="proceed_to_checkout"], button.o_wsale_go_to_checkout');
        if (!checkoutButtons.length) {
            return;
        }
        
        if (tosCheckoutDialog || hasDialog) {
            checkoutButtons.off('click.tos').on('click.tos', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var $trigger = $(this);
                var dialog = $('#checkout_tos_dialog');
                if (!dialog.length) {
                    return;
                }
                var dialogCheckbox = $('#tos_dialog_accepted');
                var acceptBtn = $('#tos_dialog_accept_btn');
                var targetUrl = $trigger.attr('href') ||
                    $trigger.data('href') ||
                    $trigger.data('url') ||
                    $trigger.attr('formaction') ||
                    $trigger.closest('form').attr('action') ||
                    '/shop/checkout';
                dialog.data('tos-next-url', targetUrl);
                if (dialogCheckbox.length) {
                    dialogCheckbox.prop('checked', false);
                }
                if (acceptBtn.length) {
                    acceptBtn.prop('disabled', true);
                }
                // Prevent body scroll when modal opens (like window configurator)
                document.body.style.overflow = 'hidden';
                
                // Show modal using window configurator style (fixed positioning with flexbox)
                dialog.addClass('show');
                
                // Also support Bootstrap modal if available (for compatibility)
                var opened = false;
                if (typeof dialog.modal === 'function') {
                    dialog.modal({
                        backdrop: 'static',
                        keyboard: false,
                        show: true,
                    });
                    opened = true;
                } else if (window.bootstrap && window.bootstrap.Modal) {
                    var modalInstance = window.bootstrap.Modal.getOrCreateInstance(dialog[0], {
                        backdrop: 'static',
                        keyboard: false,
                    });
                    modalInstance.show();
                    opened = true;
                }
                
                // Ensure modal is visible and centered (scroll into view if needed)
                setTimeout(function() {
                    var modalDialog = dialog.find('.modal-dialog').first();
                    if (modalDialog.length) {
                        // Scroll modal into view (though with fixed positioning it should already be centered)
                        modalDialog[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 10);
                dialog.off('shown.bs.modal.tos').on('shown.bs.modal.tos', function () {
                    self._adjustModalForHeader(dialog);
                    // Reset checkbox and button state when dialog is shown
                    if (dialogCheckbox.length) {
                        dialogCheckbox.prop('checked', false);
                    }
                    if (acceptBtn.length) {
                        acceptBtn.prop('disabled', true).removeClass('btn-success').addClass('btn-primary');
                    }
                    // Scroll to top of content
                    var scrollableContent = dialog.find('.tos-content-scrollable');
                    if (scrollableContent.length) {
                        scrollableContent.scrollTop(0);
                    }
                });
                if (dialogCheckbox.length && acceptBtn.length) {
                    // Ensure checkbox is unchecked and button is disabled when dialog opens
                    dialogCheckbox.prop('checked', false);
                    acceptBtn.prop('disabled', true).removeClass('btn-success').addClass('btn-primary');
                    
                    // Handle checkbox change - enable/disable accept button
                    dialogCheckbox.off('change.tos').on('change.tos', function () {
                        var isChecked = this.checked;
                        acceptBtn.prop('disabled', !isChecked);
                        
                        // Add visual feedback
                        if (isChecked) {
                            acceptBtn.removeClass('btn-primary').addClass('btn-success');
                        } else {
                            acceptBtn.removeClass('btn-success').addClass('btn-primary');
                        }
                    });
                    
                    // Handle accept button click - validate checkbox is checked before proceeding
                    acceptBtn.off('click.tos').on('click.tos', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (!dialogCheckbox.is(':checked')) {
                            // If somehow clicked without checkbox, prevent action
                            dialogCheckbox.focus();
                            return false;
                        }
                        
                        // Checkbox is checked - proceed to checkout
                        var actionUrl = dialog.data('tos-next-url') || '/shop/checkout';
                        var form = $('<form>').attr({
                            method: 'POST',
                            action: actionUrl,
                        });
                        form.append($('<input>').attr({
                            type: 'hidden',
                            name: 'tos_accepted',
                            value: 'on',
                        }));
                        $('body').append(form);
                        form.submit();
                    });
                }
                dialog.off('hidden.bs.modal.tos').on('hidden.bs.modal.tos', function () {
                    // Restore body scroll when modal closes
                    document.body.style.overflow = '';
                    dialog.removeClass('show');
                    
                    if (dialogCheckbox.length) {
                        dialogCheckbox.prop('checked', false);
                    }
                    if (acceptBtn.length) {
                        acceptBtn.prop('disabled', true).removeClass('btn-success').addClass('btn-primary');
                    }
                });
                
                // Also handle close button clicks to restore body scroll
                dialog.find('[data-dismiss="modal"], [data-bs-dismiss="modal"], .btn-close').off('click.tos-close').on('click.tos-close', function() {
                    setTimeout(function() {
                        document.body.style.overflow = '';
                        dialog.removeClass('show');
                    }, 300); // Wait for Bootstrap animation if any
                });
                
                // Also reset when dialog is shown to ensure clean state
                dialog.off('shown.bs.modal.tos-reset').on('shown.bs.modal.tos-reset', function () {
                    if (dialogCheckbox.length) {
                        dialogCheckbox.prop('checked', false);
                    }
                    if (acceptBtn.length) {
                        acceptBtn.prop('disabled', true).removeClass('btn-success').addClass('btn-primary');
                    }
                });
            });
        } else if (hasCheckbox) {
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
        }
        
        // Handle payment page TOS checkbox (different ID: #tos_accepted)
        var $paymentTosCheckbox = $('#tos_accepted');
        if ($paymentTosCheckbox.length && !$paymentTosCheckbox.is('#tos_accepted_cart')) {
            var self = this;
            
            function updatePaymentButton() {
                var isChecked = $paymentTosCheckbox.is(':checked');
                self._updatePaymentButtonState(isChecked);
            }
            
            // Initialize button state
            updatePaymentButton();
            
            // Update on checkbox change
            $paymentTosCheckbox.off('change.tos-payment').on('change.tos-payment', updatePaymentButton);
            
            // Prevent form submission if checkbox not checked
            var $paymentForm = $('#o_payment_form, form[name="payment"]');
            if ($paymentForm.length) {
                $paymentForm.off('submit.tos-payment').on('submit.tos-payment', function(e) {
                    if (!$paymentTosCheckbox.is(':checked')) {
                        e.preventDefault();
                        e.stopPropagation();
                        $paymentTosCheckbox.focus();
                        // Show visual feedback
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
            // Initialize button state
            this._updatePaymentButtonState($paymentTosCheckbox.is(':checked'));
            
            // Update on checkbox change
            $paymentTosCheckbox.off('change.tos-payment-init').on('change.tos-payment-init', function() {
                self._updatePaymentButtonState($(this).is(':checked'));
            });
            
            // Prevent form submission if checkbox not checked
            var $paymentForm = $('#o_payment_form, form[name="payment"]');
            if ($paymentForm.length) {
                $paymentForm.off('submit.tos-payment-init').on('submit.tos-payment-init', function(e) {
                    if (!$paymentTosCheckbox.is(':checked')) {
                        e.preventDefault();
                        e.stopPropagation();
                        $paymentTosCheckbox.focus();
                        // Show visual feedback
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

    /**
     * Initialize TOS modal (for viewing TOS content)
     */
    _initializeTOSModal: function () {
        var self = this;
        var $tosModal = $('#checkout_tos_modal');
        
        if ($tosModal.length) {
            $('a[data-bs-toggle="modal"][data-bs-target="#checkout_tos_modal"], a[data-toggle="modal"][data-target="#checkout_tos_modal"], a[href*="#checkout_tos_modal"]').off('click.tos').on('click.tos', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Prevent body scroll when modal opens
                document.body.style.overflow = 'hidden';
                
                // Show modal using window configurator style
                $tosModal.addClass('show');
                
                // Also support Bootstrap modal if available
                if (typeof $tosModal.modal === 'function') {
                    $tosModal.modal('show');
                } else if (window.bootstrap && window.bootstrap.Modal) {
                    window.bootstrap.Modal.getOrCreateInstance($tosModal[0]).show();
                }
                
                // Ensure modal is visible and centered
                setTimeout(function() {
                    var modalDialog = $tosModal.find('.modal-dialog').first();
                    if (modalDialog.length) {
                        modalDialog[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 10);
            });
            
            $tosModal.off('shown.bs.modal.tos').on('shown.bs.modal.tos', function() {
                self._adjustModalForHeader($tosModal);
            });
            
            // Handle modal close to restore body scroll
            $tosModal.off('hidden.bs.modal.tos').on('hidden.bs.modal.tos', function() {
                document.body.style.overflow = '';
                $tosModal.removeClass('show');
            });
            
            // Handle close button clicks
            $tosModal.find('[data-dismiss="modal"], [data-bs-dismiss="modal"], .btn-close').off('click.tos-close').on('click.tos-close', function() {
                setTimeout(function() {
                    document.body.style.overflow = '';
                    $tosModal.removeClass('show');
                }, 300);
            });
        }
    },

    /**
     * Adjust modal position to account for fixed/sticky header
     * Note: With fixed positioning and flexbox centering, this is less critical,
     * but we keep it for compatibility with Bootstrap modals
     */
    _adjustModalForHeader: function ($modal) {
        // With window configurator style (fixed + flexbox), modal is already centered
        // This function is kept for Bootstrap modal compatibility
        // No adjustment needed for fixed positioning
    },
});

