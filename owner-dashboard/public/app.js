class OwnerDashboard {
    constructor() {
        this.apiBase = '/api';
        this.socket = io();
        this.token = localStorage.getItem('adminToken');
        this.orders = [];
        
        this.init();
    }

    async init() {
        if (this.token) {
            await this.verifyToken();
        } else {
            this.showLogin();
        }
        
        this.bindEvents();
    }

    async verifyToken() {
        try {
            if (this.token) {
                this.showDashboard();
                this.loadOrders();
                this.joinAdminRoom();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            this.showLogin();
        }
    }

    bindEvents() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Socket events
        this.socket.on('new-order', (order) => {
            this.addNewOrder(order);
        });

        this.socket.on('order-updated', (order) => {
            this.updateOrder(order);
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${this.apiBase}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (result.success) {
                this.token = result.token;
                localStorage.setItem('adminToken', this.token);
                document.getElementById('adminName').textContent = result.admin.username;
                this.showDashboard();
                this.loadOrders();
                this.joinAdminRoom();
            } else {
                alert('Login failed: ' + result.message);
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    }

    handleLogout() {
        localStorage.removeItem('adminToken');
        this.token = null;
        this.showLogin();
    }

    showLogin() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }

    showDashboard() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
    }

    joinAdminRoom() {
        this.socket.emit('join-admin');
    }

    async loadOrders() {
        try {
            const response = await fetch(`${this.apiBase}/orders`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                this.orders = result.orders;
                this.renderOrders();
                this.updateStats();
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    renderOrders() {
        const container = document.getElementById('ordersContainer');
        const emptyState = document.getElementById('emptyOrders');

        if (this.orders.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        container.innerHTML = '';

        // Sort orders: pending first, then by creation time
        const sortedOrders = [...this.orders].sort((a, b) => {
            const statusOrder = { 
                'pending': 0, 
                'confirmed': 1, 
                'preparing': 2, 
                'ready': 3, 
                'completed': 4,
                'cancelled': 5
            };
            
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        sortedOrders.forEach(order => {
            const orderElement = this.createOrderElement(order);
            container.appendChild(orderElement);
        });
    }

    createOrderElement(order) {
        const element = document.createElement('div');
        element.className = `bg-white rounded-lg border-l-4 shadow-sm p-6 fade-in status-${order.status}`;
        
        const statusColors = {
            'pending': 'bg-yellow-100 text-yellow-800',
            'confirmed': 'bg-blue-100 text-blue-800',
            'preparing': 'bg-purple-100 text-purple-800',
            'ready': 'bg-green-100 text-green-800',
            'completed': 'bg-gray-100 text-gray-800',
            'cancelled': 'bg-red-100 text-red-800'
        };

        const statusText = {
            'pending': 'Pending',
            'confirmed': 'Confirmed',
            'preparing': 'Preparing',
            'ready': 'Ready',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };

        const createdAt = new Date(order.createdAt).toLocaleTimeString([], { 
            hour: '2-digit', minute: '2-digit' 
        });

        element.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h3 class="font-bold text-lg text-gray-800">Order #${order.orderId}</h3>
                    <p class="text-gray-600 text-sm">Table ${order.tableNumber} • ${createdAt}</p>
                </div>
                <span class="status-badge px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}">
                    ${statusText[order.status]}
                </span>
            </div>
            
            <div class="mb-4">
                <p class="font-medium text-gray-700">${order.customerName}</p>
                <p class="text-gray-600 text-sm">${order.customerPhone}</p>
            </div>
            
            <div class="border-t border-gray-100 pt-3 mb-4">
                ${order.items.map(item => `
                    <div class="flex justify-between items-center mb-2">
                        <div class="flex items-center">
                            <span class="text-gray-700 font-medium">${item.quantity}x</span>
                            <span class="ml-2 text-gray-800">${item.name}</span>
                        </div>
                        <span class="text-gray-700">$${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="flex justify-between items-center border-t border-gray-100 pt-3 mb-4">
                <span class="font-semibold text-gray-800">Total:</span>
                <span class="font-bold text-indigo-600">$${order.total.toFixed(2)}</span>
            </div>
            
            <div class="flex space-x-2">
                ${order.status === 'pending' ? `
                    <button class="update-status-btn flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition" data-id="${order._id}" data-status="confirmed">
                        Confirm
                    </button>
                    <button class="update-status-btn flex-1 bg-gray-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition" data-id="${order._id}" data-status="cancelled">
                        Cancel
                    </button>
                ` : ''}
                
                ${order.status === 'confirmed' ? `
                    <button class="update-status-btn flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition" data-id="${order._id}" data-status="preparing">
                        Start Prep
                    </button>
                ` : ''}
                
                ${order.status === 'preparing' ? `
                    <button class="update-status-btn flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition" data-id="${order._id}" data-status="ready">
                        Mark Ready
                    </button>
                ` : ''}
                
                ${order.status === 'ready' ? `
                    <button class="update-status-btn flex-1 bg-gray-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-900 transition" data-id="${order._id}" data-status="completed">
                        Complete
                    </button>
                ` : ''}
            </div>
        `;

        // Add event listeners to status update buttons
        element.querySelectorAll('.update-status-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.dataset.id;
                const newStatus = e.target.dataset.status;
                this.updateOrderStatus(orderId, newStatus);
            });
        });

        return element;
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            const response = await fetch(`${this.apiBase}/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            const result = await response.json();

            if (!result.success) {
                alert('Failed to update order status: ' + result.message);
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Failed to update order status. Please try again.');
        }
    }

    addNewOrder(order) {
        this.orders.unshift(order);
        this.renderOrders();
        this.updateStats();
        
        // Show notification
        this.showNotification(`New order from ${order.customerName} at Table ${order.tableNumber}`);
    }

    updateOrder(updatedOrder) {
        const index = this.orders.findIndex(order => order._id === updatedOrder._id);
        if (index !== -1) {
            this.orders[index] = updatedOrder;
            this.renderOrders();
            this.updateStats();
        }
    }

    updateStats() {
        const pendingCount = this.orders.filter(order => order.status === 'pending').length;
        const preparingCount = this.orders.filter(order => order.status === 'preparing').length;
        const readyCount = this.orders.filter(order => order.status === 'ready').length;
        const totalCount = this.orders.length;

        document.getElementById('pendingCount').textContent = pendingCount;
        document.getElementById('preparingCount').textContent = preparingCount;
        document.getElementById('readyCount').textContent = readyCount;
        document.getElementById('totalCount').textContent = totalCount;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 max-w-sm z-50 fade-in';
        notification.innerHTML = `
            <div class="flex items-center">
                <div class="flex-shrink-0 text-green-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-gray-800">${message}</p>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    new OwnerDashboard();
});