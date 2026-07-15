// ==========================================================
// FOODIE EXPRESS - COMPREHENSIVE FRONTEND INTERACTION ENGINE
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
    // UI DOM Elements
    const cartItemsContainer = document.getElementById("cart-items");
    const cartCount = document.getElementById("cart-count");
    const totalPriceEl = document.getElementById("total-price");
    const searchInput = document.querySelector(".search-box input");
    const searchButton = document.getElementById("search-btn");
    const checkoutBtn = document.querySelector(".checkout-btn");
    const loginBtn = document.querySelector(".login-btn");
    
    // Auth Modal DOM Elements
    const authModal = document.getElementById("auth-modal");
    const closeAuthModal = document.getElementById("close-auth-modal");
    const modalAuthForm = document.getElementById("modal-auth-form");
    const authModalTitle = document.getElementById("auth-modal-title");
    const authModalSubtitle = document.getElementById("auth-modal-subtitle");
    const authSubmitBtn = document.getElementById("auth-submit-btn");
    const authUsernameInput = document.getElementById("auth-username");
    const authPasswordInput = document.getElementById("auth-password");

    // Fail-Safe Toggle Selectors
    const toggleAuthMode = document.getElementById("toggle-auth-mode") || 
                           document.querySelector(".modal-switch-link");
                           
    const toggleAuthModeText = document.getElementById("toggle-auth-mode-text");

    let isLoginMode = true; 
    const BACKEND_URL = "http://localhost:3000/api/v1";

    // Initialize UI Elements Safely
    updateLoginButtonUI();
    
    if (localStorage.getItem("foodie_token")) {
        syncWithBackend();
    }

    // ==========================================================
    // PREMIUM TOAST NOTIFICATION CONTROLLER
    // ==========================================================
    function showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        if (!container) return;

        let icon = "🔔";
        if (type === "success") icon = "✅";
        if (type === "error") icon = "❌";

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => toast.classList.add("show"), 10);

        setTimeout(() => {
            toast.classList.remove("show");
            toast.addEventListener("transitionend", () => toast.remove());
        }, 4000);
    }

    // Secure Request Header Helper
    function getAuthHeaders() {
        const token = localStorage.getItem("foodie_token");
        return {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
        };
    }

    function updateLoginButtonUI() {
        if (!loginBtn) return;
        const username = localStorage.getItem("foodie_user");
        if (username) {
            loginBtn.innerText = `👋 Logout (${username})`;
            loginBtn.style.backgroundColor = "#c62828";
            loginBtn.style.color = "#ffffff";
            loginBtn.style.cursor = "pointer";
        } else {
            loginBtn.innerText = "🔑 Sign In / Register";
            loginBtn.style.backgroundColor = ""; 
            loginBtn.style.color = "";           
            loginBtn.style.cursor = "pointer";
        }
    }

    async function syncWithBackend() {
        try {
            const response = await fetch(`${BACKEND_URL}/cart`, { 
                headers: getAuthHeaders(),
                signal: AbortSignal.timeout(4000)
            });
            
            if (response.status === 401 || response.status === 403) {
                clearAuthSession();
                return;
            }
            
            const currentCart = await response.json();
            updateFrontendCartUI(currentCart);
        } catch (error) {
            showToast("Offline: Operating in guest mode.", "info");
            updateFrontendCartUI([]); 
        }
    }

    function clearAuthSession() {
        const oldUser = localStorage.getItem("foodie_user");
        localStorage.removeItem("foodie_token");
        localStorage.removeItem("foodie_user");
        updateLoginButtonUI();
        updateFrontendCartUI([]);
        if (oldUser) {
            showToast("Securely logged out. See you next time!", "info");
        }
    }

    // Smooth Scroll Helper
    function smoothScrollToElement(targetId) {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // ==========================================================
    // BULLETPROOF MODAL AUTH CONTROLLER ENGINE
    // ==========================================================
    if (loginBtn) {
        loginBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (localStorage.getItem("foodie_token")) {
                clearAuthSession();
                return;
            }
            openAuthModalForm(true);
        });
    }

    if (closeAuthModal) {
        closeAuthModal.addEventListener("click", () => {
            authModal.style.display = "none";
        });
    }

    if (authModal) {
        authModal.addEventListener("click", (e) => {
            if (e.target === authModal) {
                authModal.style.display = "none";
            }
        });
    }

    if (toggleAuthMode) {
        toggleAuthMode.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openAuthModalForm(!isLoginMode);
        });
    }

    function openAuthModalForm(useLoginMode) {
        isLoginMode = useLoginMode;
        
        if (authUsernameInput) authUsernameInput.value = "";
        if (authPasswordInput) authPasswordInput.value = "";
        
        if (isLoginMode) {
            if (authModalTitle) authModalTitle.innerText = "Welcome Back";
            if (authModalSubtitle) authModalSubtitle.innerText = "Sign in to unlock personalized menus and direct checkout.";
            if (authSubmitBtn) authSubmitBtn.innerText = "Continue Securely";
            if (toggleAuthModeText) toggleAuthModeText.innerText = "New to Foodie Express? ";
            if (toggleAuthMode) toggleAuthMode.innerText = "Create an account";
        } else {
            if (authModalTitle) authModalTitle.innerText = "Join Foodie Express";
            if (authModalSubtitle) authModalSubtitle.innerText = "Register your profile to track order history and faster delivery.";
            if (authSubmitBtn) authSubmitBtn.innerText = "Create My Account";
            if (toggleAuthModeText) toggleAuthModeText.innerText = "Already registered? ";
            if (toggleAuthMode) toggleAuthMode.innerText = "Sign in instead";
        }
        
        if (authModal) {
            authModal.style.display = "flex";
        }
    }

    if (modalAuthForm) {
        modalAuthForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = authUsernameInput ? authUsernameInput.value.trim() : "";
            const password = authPasswordInput ? authPasswordInput.value : "";

            const urlEndpoint = isLoginMode ? `${BACKEND_URL}/auth/login` : `${BACKEND_URL}/auth/register`;

            try {
                let response = await fetch(urlEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });
                let data = await response.json();

                if (!response.ok) {
                    showToast(data.error || "Authentication failed.", "error");
                    return;
                }

                if (isLoginMode) {
                    localStorage.setItem("foodie_token", data.token);
                    localStorage.setItem("foodie_user", data.username);
                    if (authModal) authModal.style.display = "none";
                    updateLoginButtonUI();
                    syncWithBackend();
                    showToast(`Access Authorized. Welcome back, ${data.username}!`, "success");
                } else {
                    showToast("Account created successfully!", "success");
                    openAuthModalForm(true);
                }
            } catch (err) {
                showToast("Server connection error. Try again later.", "error");
            }
        });
    }

    // ==========================================================
    // BACKEND CART OPERATION ACTIONS
    // ==========================================================
    document.body.addEventListener("click", async (e) => {
        if (e.target.classList.contains("add-cart")) {
            if (!localStorage.getItem("foodie_token")) {
                showToast("Please sign in or register before building your cart.", "info");
                openAuthModalForm(true);
                return;
            }

            const btn = e.target;
            const card = btn.closest(".food-card");
            if (!card) return;
            const name = card.querySelector("h3").innerText.toLowerCase();

            let serverItemId = 1; 
            if (name.includes("burger")) serverItemId = 2;
            if (name.includes("sushi")) serverItemId = 3;

            try {
                const response = await fetch(`${BACKEND_URL}/cart`, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ itemId: serverItemId })
                });

                const data = await response.json();

                if (data.success) {
                    updateFrontendCartUI(data.cart);
                    showToast(`Added ${card.querySelector("h3").innerText} to your cart!`, "success");
                    btn.innerText = "Added!✓";
                    btn.style.backgroundColor = "#2e7d32";
                    btn.style.color = "#ffffff";
                    
                    setTimeout(() => {
                        btn.innerText = "Add to Cart";
                        btn.style.backgroundColor = "";
                        btn.style.color = "";
                    }, 800);
                }
            } catch (error) {
                showToast("Could not sync item to cart on server.", "error");
            }
        }
    });

    window.changeQty = async function(itemId, change) {
        try {
            const response = await fetch(`${BACKEND_URL}/cart/quantity`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ itemId, change })
            });
            const data = await response.json();
            if (data.success) {
                updateFrontendCartUI(data.cart);
                showToast("Cart updated.", "info");
            }
        } catch (err) { 
            showToast("Failed to alter quantity.", "error");
        }
    };

    window.removeItem = async function(itemId) {
        try {
            const response = await fetch(`${BACKEND_URL}/cart/delete`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ itemId })
            });
            const data = await response.json();
            if (data.success) {
                updateFrontendCartUI(data.cart);
                showToast("Item removed from cart.", "info");
            }
        } catch (err) { 
            showToast("Failed to remove item.", "error");
        }
    };

    function updateFrontendCartUI(cartArray, customHtmlMessage = null) {
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = "";
        
        // Check if there is a deliberate checkout confirmation message to display
        if (customHtmlMessage) {
            cartItemsContainer.innerHTML = customHtmlMessage;
            if (totalPriceEl) totalPriceEl.innerText = "0.00";
            if (cartCount) cartCount.innerText = "0";
            return;
        }

        if (!cartArray || cartArray.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-msg">Your cart is empty. Explore our menu to add items!</p>';
            if (totalPriceEl) totalPriceEl.innerText = "0.00";
            if (cartCount) cartCount.innerText = "0";
            return;
        }

        let total = 0, totalQty = 0;
        cartArray.forEach((item) => {
            total += item.price * item.qty;
            totalQty += item.qty;

            const row = document.createElement("div");
            row.className = "cart-item-row";
            row.innerHTML = `
                <div class="cart-item-info">
                    <span class="cart-item-name">${item.name}</span>
                    <span class="cart-item-price">$${item.price.toFixed(2)} each</span>
                </div>
                <div class="cart-qty-controls">
                    <button class="qty-btn" onclick="changeQty(${item.id}, -1)">-</button>
                    <span class="qty-val">${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
                </div>
                <button class="delete-item-btn" onclick="removeItem(${item.id})">Delete</button>
            `;
            cartItemsContainer.appendChild(row);
        });

        if (totalPriceEl) totalPriceEl.innerText = total.toFixed(2);
        if (cartCount) cartCount.innerText = totalQty;
    }

    // ==========================================================
    // SECURE AND VISUALLY INTERACTIVE CHECKOUT DISPATCH
    // ==========================================================
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", async () => {
            if (!localStorage.getItem("foodie_token")) {
                showToast("🔒 Security Intercept: Please sign in before checking out.", "error");
                openAuthModalForm(true);
                return;
            }

            if (cartCount && cartCount.innerText === "0") {
                showToast("🛒 Your cart is empty! Add yummy dishes before checking out.", "info");
                return;
            }

            try {
                showToast("⏳ Processing transaction securely...", "info");
                
                const response = await fetch(`${BACKEND_URL}/checkout`, { 
                    method: "POST", 
                    headers: getAuthHeaders() 
                });
                
                const data = await response.json();

                if (response.ok && data.success) {
                    showToast("Order placed successfully!", "success");
                    
                    // Build a beautiful real-world receipt layout card right in the cart panel
                    const confirmedOrderId = data.orderId || 'FX-' + Math.floor(100000 + Math.random() * 900000);
                    const receiptHTML = `
                        <div class="order-success-box" style="text-align: center; padding: 25px 15px; background: #f0fdf4; border: 2px dashed #10b981; border-radius: 12px; margin: 10px 0;">
                            <span style="font-size: 2.5rem;">🎉</span>
                            <h4 style="color: #15803d; margin: 10px 0 5px 0; font-size: 1.2rem; font-weight: bold;">Order Confirmed!</h4>
                            <p style="color: #166534; font-size: 0.9rem; margin: 0 0 12px 0;">Your food is being freshly prepared.</p>
                            <div style="background: #ffffff; padding: 8px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; color: #374151; border: 1px solid #e5e7eb;">
                                <strong>Receipt Reference:</strong><br>${confirmedOrderId}
                            </div>
                        </div>
                    `;
                    
                    // Render the order card directly inside the cart box
                    updateFrontendCartUI([], receiptHTML);
                } else {
                    showToast(`⚠️ Transaction Denied: ${data.error || "Empty cart data."}`, "error");
                }
            } catch (error) {
                console.error("❌ Checkout system error logs:", error);
                showToast("💥 Order processing connection failed. Is your server running?", "error");
            }
        });
    }

    // ==========================================================
    // INTERACTIVE FILTER SELECTION & RESETS
    // ==========================================================
    function filterFoodItems() {
        if (!searchInput) return;
        const query = searchInput.value.toLowerCase().trim();
        const foodCards = document.querySelectorAll(".food-card");
        const menuContainer = document.querySelector(".menu-container");
        
        const existingMsg = document.getElementById("search-empty-msg");
        if (existingMsg) existingMsg.remove();
        let visibleCount = 0;

        foodCards.forEach(card => {
            const name = card.querySelector("h3").innerText.toLowerCase();
            const description = card.querySelector(".food-desc") ? card.querySelector(".food-desc").innerText.toLowerCase() : "";
            if (name.includes(query) || description.includes(query)) {
                card.style.display = ""; visibleCount++;
            } else {
                card.style.display = "none";
            }
        });

        if (visibleCount === 0 && menuContainer) {
            const noMatchMsg = document.createElement("p");
            noMatchMsg.id = "search-empty-msg";
            noMatchMsg.style.gridColumn = "1 / -1"; noMatchMsg.style.textAlign = "center";
            noMatchMsg.style.padding = "40px 20px"; noMatchMsg.style.fontSize = "1.1rem"; noMatchMsg.style.color = "#666";
            noMatchMsg.innerHTML = `🔍 Sorry, we couldn't find any dishes matching "<strong>${searchInput.value}</strong>".`;
            menuContainer.appendChild(noMatchMsg);
        }
    }

    if (searchInput) {
        searchInput.addEventListener("input", filterFoodItems);
    }

    if (searchButton) {
        searchButton.addEventListener("click", (e) => {
            e.preventDefault(); 
            filterFoodItems();
            smoothScrollToElement("menu");
        });
    }

    const categories = document.querySelectorAll(".category");
    categories.forEach(categoryBox => {
        categoryBox.addEventListener("click", () => {
            if (!searchInput) return;
            const text = categoryBox.innerText.toLowerCase();
            if (text.includes("pizza")) searchInput.value = "pizza";
            else if (text.includes("burger")) searchInput.value = "burger";
            else if (text.includes("sushi")) searchInput.value = "sushi";
            else if (text.includes("healthy")) searchInput.value = "healthy";
            else if (text.includes("dessert")) searchInput.value = "dessert";
            else if (text.includes("drinks")) searchInput.value = "drinks";
            filterFoodItems();
            smoothScrollToElement("menu");
        });
    });

    const viewMenuBtns = document.querySelectorAll(".view-menu-btn, a[href='#menu']");
    viewMenuBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            if (searchInput) searchInput.value = "";
            document.querySelectorAll(".food-card").forEach(card => card.style.display = "");
            const existingMsg = document.getElementById("search-empty-msg");
            if (existingMsg) existingMsg.remove();
            smoothScrollToElement("menu");
        });
    });
});
