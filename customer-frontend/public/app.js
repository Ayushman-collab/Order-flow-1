class QRCodeCafe {
    constructor() {
        this.apiBase = '/api';
        this.socket = io();
        this.state = {
            currentStep: 1,
            customerInfo: {},
            cart: [],
            menuItems: [],
            tableId: this.getTableIdFromURL()
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadMenuItems();
        this.updateTableInfo();
    }

    getTableIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('table') || '1';
    }

    updateTableInfo() {
        document.getElementById('tableNumber').textContent = this.state.tableId;
    }

    async loadMenuItems() {
        try {
            const response = await fetch(`${this.apiBase}/menu`);
            const data = await response.json();
            
            if (data.success) {
                this.state.menuItems = data.menuItems;
                this.renderMenuItems();
            }
        } catch (error) {
            console.error('Error loading menu:', error);
        }
    }

    bindEvents() {
        // Form submission
        document.getElementById('customerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCustomerFormSubmit();
        });

        // Cart interactions
        document.getElementById('viewCartBtn').addEventListener('click', () => this.openCart());
        document.getElementById('closeCartBtn').addEventListener('click', () => this.closeCart());
        document.getElementById('checkoutBtn').addEventListener('click', () => this.proceedToCheckout());
        document.getElementById('backToMenuBtn').addEventListener('click', () => this.backToMenu());
        document.getElementById('placeOrderBtn').addEventListener('click', () => this.placeOrder());
        document.getElementById('newOrderBtn').addEventListener('click', () => this.startNewOrder());

        // Category filters
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.filterMenuByCategory(category);
                
                // Update active state
                document.querySelectorAll('.category-btn').forEach(b => {
                    b.classList.remove('active', 'bg-indigo-600', 'text-white');
                    b.classList.add('bg-gray-200', 'text-gray-700');
                });
                e.target.classList.remove('bg-gray-200', 'text-gray-700');
                e.target.classList.add('active', 'bg-indigo-600', 'text-white');
            });
        });
    }

    handleCustomerFormSubmit() {
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();

        if (name && phone) {
            this.state.customerInfo = { name, phone };
            this.showStep(2);
        }
    }

    showStep(step) {
        // Hide all steps
        document.querySelectorAll('[id^="step"], #orderConfirmation').forEach(el => {
            el.classList.add('hidden');
        });

        // Show requested step
        if (step === 1) {
            document.getElementById('step1').classList.remove('hidden');
        } else if (step === 2) {
            document.getElementById('step2').classList.remove('hidden');
        } else if (step === 3) {
            this.renderOrderSummary();
            document.getElementById('step3').classList.remove('hidden');
        } else if (step === 'confirmation') {
            document.getElementById('orderConfirmation').classList.remove('hidden');
        }

        this.state.currentStep = step;
    }

    renderMenuItems() {
        const container = document.getElementById('menuItems');
        container.innerHTML = '';

        this.state.menuItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'bg-white rounded-xl shadow-sm overflow-hidden slide-in';
            itemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="product-image">
                <div class="p-4">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-semibold text-gray-800">${item.name}</h3>
                        <span class="text-indigo-600 font-medium">$${item.price.toFixed(2)}</span>
                    </div>
                    <p class="text-gray-600 text-sm mb-4">${item.description}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">${item.category}</span>
                        <button class="add-to-cart-btn bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-indigo-700 transition" data-id="${item._id}">
                            Add to Cart
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(itemElement);
        });

        // Add event listeners to "Add to Cart" buttons
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.id;
                this.addToCart(itemId);
            });
        });
    }

    filterMenuByCategory(category) {
        const allItems = document.querySelectorAll('#menuItems > div');
        
        allItems.forEach(item => {
            if (category === 'all') {
                item.classList.remove('hidden');
            } else {
                const itemCategory = item.querySelector('span').textContent.toLowerCase();
                if (itemCategory === category) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            }
        });
    }

    addToCart(itemId) {
        const item = this.state.menuItems.find(i => i._id === itemId);
        if (!item) return;

        const existingItem = this.state.cart.find(i => i.menuItemId === itemId);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.state.cart.push({
                menuItemId: item._id,
                name: item.name,
                price: item.price,
                quantity: 1,
                image: item.image
            });
        }

        this.updateCartUI();
        this.showToast(`${item.name} added to cart`, 'success');
    }

    removeFromCart(itemId) {
        this.state.cart = this.state.cart.filter(item => item.menuItemId !== itemId);
        this.updateCartUI();
    }

    updateCartItemQuantity(itemId, newQuantity) {
        if (newQuantity < 1) {
            this.removeFromCart(itemId);
            return;
        }

        const item = this.state.cart.find(i => i.menuItemId === itemId);
        if (item) {
            item.quantity = newQuantity;
        }

        this.updateCartUI();
    }

    updateCartUI() {
        // Update cart count indicator
        const totalItems = this.state.cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartIndicator = document.getElementById('cartIndicator');
        const cartCount = document.getElementById('cartCount');

        if (totalItems > 0) {
            cartIndicator.classList.remove('hidden');
            cartCount.textContent = totalItems;
        } else {
            cartIndicator.classList.add('hidden');
        }

        // Update cart items in sidebar
        const cartItemsContainer = document.getElementById('cartItems');
        cartItemsContainer.innerHTML = '';

        if (this.state.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <svg class="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    <p>Your cart is empty</p>
                </div>
            `;
            document.getElementById('cartSubtotal').textContent = '$0.00';
            return;
        }

        let subtotal = 0;

        this.state.cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'flex items-center py-3 border-b border-gray-100';
            cartItemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded mr-3">
                <div class="flex-1">
                    <h4 class="font-medium text-gray-800">${item.name}</h4>
                    <p class="text-gray-600 text-sm">$${item.price.toFixed(2)} each</p>
                </div>
                <div class="flex items-center space-x-2">
                    <button class="decrease-quantity text-gray-500 hover:text-gray-700" data-id="${item.menuItemId}">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                        </svg>
                    </button>
                    <span class="quantity-display w-8 text-center">${item.quantity}</span>
                    <button class="increase-quantity text-gray-500 hover:text-gray-700" data-id="${item.menuItemId}">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                    </button>
                    <button class="remove-item text-red-500 hover:text-red-700 ml-2" data-id="${item.menuItemId}">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            `;

            cartItemsContainer.appendChild(cartItemElement);
        });

        // Add event listeners to cart item buttons
        document.querySelectorAll('.decrease-quantity').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.closest('button').dataset.id;
                const item = this.state.cart.find(i => i.menuItemId === itemId);
                if (item) {
                    this.updateCartItemQuantity(itemId, item.quantity - 1);
                }
            });
        });

        document.querySelectorAll('.increase-quantity').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.closest('button').dataset.id;
                const item = this.state.cart.find(i => i.menuItemId === itemId);
                if (item) {
                    this.updateCartItemQuantity(itemId, item.quantity + 1);
                }
            });
        });

        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.closest('button').dataset.id;
                this.removeFromCart(itemId);
            });
        });

        document.getElementById('cartSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    }

    openCart() {
        document.getElementById('cartSidebar').classList.remove('translate-x-full');
    }

    closeCart() {
        document.getElementById('cartSidebar').classList.add('translate-x-full');
    }

    proceedToCheckout() {
        if (this.state.cart.length === 0) {
            this.showToast('Your cart is empty', 'error');
            return;
        }

        this.closeCart();
        this.showStep(3);
    }

    backToMenu() {
        this.showStep(2);
    }

    renderOrderSummary() {
        const container = document.getElementById('orderSummary');
        container.innerHTML = '';

        if (this.state.cart.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No items in your order</p>';
            document.getElementById('orderTotal').textContent = '$0.00';
            return;
        }

        let total = 0;

        this.state.cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;

            const orderItemElement = document.createElement('div');
            orderItemElement.className = 'flex items-center py-3 border-b border-gray-100';
            orderItemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="w-12 h-12 object-cover rounded mr-3">
                <div class="flex-1">
                    <h4 class="font-medium text-gray-800">${item.name}</h4>
                    <p class="text-gray-600 text-sm">Qty: ${item.quantity} × $${item.price.toFixed(2)}</p>
                </div>
                <span class="font-medium">$${itemTotal.toFixed(2)}</span>
            `;

            container.appendChild(orderItemElement);
        });

        document.getElementById('orderTotal').textContent = `$${total.toFixed(2)}`;
    }

    async placeOrder() {
        if (this.state.cart.length === 0) {
            this.showToast('Your cart is empty', 'error');
            return;
        }

        if (!this.state.tableId) {
            this.showToast('Table information is missing', 'error');
            return;
        }

        if (!this.state.customerInfo.name || !this.state.customerInfo.phone) {
            this.showToast('Please complete your customer information', 'error');
            this.showStep(1);
            return;
        }

        try {
            const orderData = {
                customerName: this.state.customerInfo.name,
                customerPhone: this.state.customerInfo.phone,
                tableNumber: this.state.tableId,
                items: this.state.cart,
                total: this.state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            };

            const response = await fetch(`${this.apiBase}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();

            if (result.success) {
                document.getElementById('confirmedOrderId').textContent = result.order.orderId;
                this.showStep('confirmation');
                this.state.cart = [];
                this.updateCartUI();
            } else {
                this.showToast(result.message, 'error');
            }
        } catch (error) {
            console.error('Error placing order:', error);
            this.showToast('Failed to place order. Please try again.', 'error');
        }
    }

    startNewOrder() {
        // Reset form and cart
        document.getElementById('customerForm').reset();
        this.state.customerInfo = {};
        this.state.cart = [];
        this.updateCartUI();
        this.showStep(1);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 bg-white border-l-4 ${
            type === 'error' ? 'border-red-500' : 
            type === 'success' ? 'border-green-500' : 'border-indigo-500'
        } rounded-lg shadow-lg p-4 max-w-sm z-50 fade-in`;
        toast.innerHTML = `
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
                </div>
                <div class="ml-3">
                    <p class="text-sm text-gray-800">${message}</p>
                </div>
            </div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new QRCodeCafe();
});