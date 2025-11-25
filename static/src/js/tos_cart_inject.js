/** @odoo-module **/

import publicWidget from "@web/legacy/js/public/public_widget";

publicWidget.registry.TOSCartInject = publicWidget.Widget.extend({
    selector: '.oe_website_sale',
    events: {},

    /**
     * @override
     */
    start: function () {
        // Make sure dialog mode logic is wired up immediately
        this._initializeTOSFunctionality();
        this._initializeTOSModal();

        // Inject TOS block after page loads (adds checkbox markup when needed)
        this._injectTOSBlock();
        return this._super.apply(this, arguments);
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
        fetch('/shop/cart/get_tos_block')
            .then(function (response) {
                console.log('[TOS Cart Inject] Server response status:', response.status, response.statusText);
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                return response.text();
            })
            .then(function (html) {
                console.log('[TOS Cart Inject] Received HTML, length:', html ? html.length : 0);
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
     * Reset TOS checkboxes to unchecked state
     */
    _resetTOSCheckboxes: function () {
        var $tosCheckbox = $('#tos_accepted_cart');
        if ($tosCheckbox.length) {
            $tosCheckbox.prop('checked', false);
        }
        
        var $dialogCheckbox = $('#tos_dialog_accepted');
        if ($dialogCheckbox.length) {
            $dialogCheckbox.prop('checked', false);
        }
        
        var $acceptBtn = $('#tos_dialog_accept_btn');
        if ($acceptBtn.length) {
            $acceptBtn.prop('disabled', true);
        }
        
        if ($tosCheckbox.length) {
            $('a[href*="/shop/checkout"], a[href*="/shop/payment"], button[type="submit"]').each(function() {
                var $btn = $(this);
                $btn.addClass('disabled').attr('disabled', 'disabled');
                if ($btn.is('a')) {
                    $btn.css({'pointer-events': 'none', 'opacity': '0.5'});
                }
            });
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
                self._adjustModalForHeader(dialog);
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
                if (!opened) {
                    dialog.show();
                }
                dialog.off('shown.bs.modal.tos').on('shown.bs.modal.tos', function () {
                    self._adjustModalForHeader(dialog);
                });
                if (dialogCheckbox.length && acceptBtn.length) {
                    dialogCheckbox.off('change.tos').on('change.tos', function () {
                        acceptBtn.prop('disabled', !this.checked);
                    });
                    acceptBtn.off('click.tos').on('click.tos', function () {
                        if (dialogCheckbox.is(':checked')) {
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
                        }
                    });
                }
                dialog.off('hidden.bs.modal.tos').on('hidden.bs.modal.tos', function () {
                    if (dialogCheckbox.length) {
                        dialogCheckbox.prop('checked', false);
                    }
                    if (acceptBtn.length) {
                        acceptBtn.prop('disabled', true);
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
                if (typeof $tosModal.modal === 'function') {
                    $tosModal.modal('show');
                } else if (window.bootstrap && window.bootstrap.Modal) {
                    window.bootstrap.Modal.getOrCreateInstance($tosModal[0]).show();
                } else {
                    $tosModal.show();
                }
            });
            
            $tosModal.off('shown.bs.modal.tos').on('shown.bs.modal.tos', function() {
                self._adjustModalForHeader($tosModal);
            });
        }
    },

    /**
     * Adjust modal position to account for fixed/sticky header
     */
    _adjustModalForHeader: function ($modal) {
        // Find fixed/sticky header elements
        var $header = $('header.navbar, .navbar-fixed-top, .navbar-sticky, [class*="header"], [class*="navbar"]').filter(function() {
            var $el = $(this);
            var position = $el.css('position');
            var zIndex = parseInt($el.css('z-index')) || 0;
            return (position === 'fixed' || position === 'sticky') && zIndex > 0;
        }).first();
        
        if ($header.length) {
            var headerHeight = $header.outerHeight() || 0;
            var modalDialog = $modal.find('.modal-dialog').first();
            
            if (modalDialog.length && headerHeight > 0) {
                // Add top margin to account for header
                var currentMargin = parseInt(modalDialog.css('margin-top')) || 0;
                var newMargin = Math.max(currentMargin, headerHeight + 20); // 20px buffer
                modalDialog.css('margin-top', newMargin + 'px');
            }
        }
    },
});

