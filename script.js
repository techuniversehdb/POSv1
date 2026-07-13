let products = JSON.parse(localStorage.getItem("products")) || [];

function saveData() {
    localStorage.setItem("products", JSON.stringify(products));
}

function addProduct() {
    const name = document.getElementById("name").value.trim();
    const buy = document.getElementById("buy").value;
    const sell = document.getElementById("sell").value;
    const stock = document.getElementById("stock").value;

    if (!name || !buy || !sell || !stock) {
        alert("Please fill all fields");
        return;
    }

    products.push({
        id: Date.now(),
        name,
        buy: Number(buy),
        sell: Number(sell),
        stock: Number(stock)
    });

    saveData();
    renderProducts();

    document.getElementById("name").value = "";
    document.getElementById("buy").value = "";
    document.getElementById("sell").value = "";
    document.getElementById("stock").value = "";
}

function deleteProduct(id) {
    products = products.filter(p => p.id !== id);
    saveData();
    renderProducts();
}

function renderProducts() {
    const list = document.getElementById("productList");
    list.innerHTML = "";

    products.forEach(p => {
        list.innerHTML += `
            <div class="product">
                <b>${p.name}</b><br>
                Buy: ₹${p.buy}<br>
                Sell: ₹${p.sell}<br>
                Stock:
                <span class="${p.stock <= 2 ? 'stock-low' : 'stock-ok'}">
                    ${p.stock}
                </span><br><br>

                <button onclick="deleteProduct(${p.id})">Delete</button>
            </div>
        `;
    });

    document.getElementById("products").innerText = products.length;
}

renderProducts();
