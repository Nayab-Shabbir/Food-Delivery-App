// FOODIE EXPRESS
document.addEventListener("DOMContentLoaded", () => {
    const cartItemsContainer = document.getElementById("cart-items");
    const cartCount = document.getElementById("cart-count");
    const totalPriceEl = document.getElementById("total-price");
    const searchInput = document.querySelector(".search-box input");
    const searchButton = document.getElementById("search-btn");
    const checkoutBtn = document.querySelector(".checkout-btn");
    const loginBtn = document.querySelector(".login-btn");

    // Cart State
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    updateCart();

    // Sign In Button
    loginBtn.addEventListener("click", () => {
        alert("🔒 Secure Sign-In coming soon! Please proceed as a guest user for now.");
    });

    // Add to Cart (Via Click Delegation)
    document.body.addEventListener("click", (e) => {
        if (e.target.classList.contains("add-cart")) {
            const btn = e.target;
            const card = btn.closest(".food-card");
            
            const name = card.querySelector("h3").innerText;
            const price = parseFloat(card.querySelector(".price").innerText.replace("$", ""));

            addToCart(name, price);

            btn.innerText = "Added! ✓";
            btn.style.backgroundColor = "#2e7d32";
            btn.style.color = "#ffffff";
            
            setTimeout(() => {
                btn.innerText = "Add to Cart";
                btn.style.backgroundColor = "";
                btn.style.color = "";
            }, 800);
        }
    });

    function addToCart(name, price) {
        const existing = cart.find(item => item.name === name);
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({ name, price, qty: 1 });
        }
        saveCart();
        updateCart();
    }

    // Global Cart Modifiers
    window.removeItem = function(index) {
        cart.splice(index, 1);
        saveCart();
        updateCart();
    };

    window.changeQty = function(index, delta) {
        cart[index].qty += delta;
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
        }
        saveCart();
        updateCart();
    };

    // Update Cart UI
    function updateCart() {
        cartItemsContainer.innerHTML = "";

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-msg">Your cart is empty. Explore our menu to add items!</p>';
            totalPriceEl.innerText = "0.00";
            cartCount.innerText = "0";
            return;
        }

        let total = 0;
        cart.forEach((item, index) => {
            total += item.price * item.qty;

            const row = document.createElement("div");
            row.className = "cart-item-row";
            row.innerHTML = `
                <div class="cart-item-info">
                    <span class="cart-item-name">${item.name}</span>
                    <span class="cart-item-price">$${item.price.toFixed(2)} each</span>
                </div>
                <div class="cart-qty-controls">
                    <button class="qty-btn" onclick="changeQty(${index}, -1)">-</button>
                    <span class="qty-val">${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                </div>
                <button class="delete-item-btn" onclick="removeItem(${index})">Delete</button>
            `;
            cartItemsContainer.appendChild(row);
        });

        totalPriceEl.innerText = total.toFixed(2);
        cartCount.innerText = cart.reduce((sum, item) => sum + item.qty, 0);
    }

    function saveCart() {
        localStorage.setItem("cart", JSON.stringify(cart));
    }

    // Live Search Filter Engine (With 'Not Found' State)
    function filterFoodItems() {
        const query = searchInput.value.toLowerCase().trim();
        const foodCards = document.querySelectorAll(".food-card");
        const menuContainer = document.querySelector(".menu-container");
        
        const existingMsg = document.getElementById("search-empty-msg");
        if (existingMsg) existingMsg.remove();

        let visibleCount = 0;

        foodCards.forEach(card => {
            const name = card.querySelector("h3").innerText.toLowerCase();
            const description = card.querySelector(".food-desc").innerText.toLowerCase();

            if (name.includes(query) || description.includes(query)) {
                card.style.display = ""; 
                visibleCount++;
            } else {
                card.style.display = "none";
            }
        });

        if (visibleCount === 0) {
            const noMatchMsg = document.createElement("p");
            noMatchMsg.id = "search-empty-msg";
            noMatchMsg.style.gridColumn = "1 / -1"; 
            noMatchMsg.style.textAlign = "center";
            noMatchMsg.style.padding = "40px 20px";
            noMatchMsg.style.fontSize = "1.1rem";
            noMatchMsg.style.color = "#666";
            noMatchMsg.innerHTML = `🔍 Sorry, we couldn't find any dishes matching "<strong>${searchInput.value}</strong>". Try searching for pizza, burgers, or sushi!`;
            
            menuContainer.appendChild(noMatchMsg);
        }
    }

    searchInput.addEventListener("input", filterFoodItems);

    searchButton.addEventListener("click", (e) => {
        e.preventDefault();
        filterFoodItems();
        document.getElementById("menu").scrollIntoView({ behavior: 'smooth' });
    });

    // Checkout Proceed Handler
    checkoutBtn.addEventListener("click", () => {
        if (cart.length === 0) {
            alert("Your cart is empty! Add some delicious dishes before trying to check out.");
            return;
        }

        alert(`🎉 Order Placed Successfully!\n\nYour total is $${totalPriceEl.innerText}. Your gourmet meal is being prepared by our top chefs and will reach your doorstep shortly.`);

        cart = [];
        saveCart();
        updateCart();
    });

    // DIRECT CATEGORY FILTER LINK
    const categories = document.querySelectorAll(".category");

    categories.forEach(categoryBox => {
        categoryBox.addEventListener("click", () => {
            const text = categoryBox.innerText.toLowerCase();
            
            if (text.includes("pizza")) searchInput.value = "pizza";
            else if (text.includes("burger")) searchInput.value = "burger";
            else if (text.includes("sushi")) searchInput.value = "sushi";
            else if (text.includes("healthy")) searchInput.value = "healthy";
            else if (text.includes("dessert")) searchInput.value = "dessert";
            else if (text.includes("drinks")) searchInput.value = "drinks";
            
            filterFoodItems();
            document.getElementById("menu").scrollIntoView({ behavior: 'smooth' });
        });
    });
});