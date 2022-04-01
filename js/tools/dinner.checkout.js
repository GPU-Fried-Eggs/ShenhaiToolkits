const cartList = document.querySelector("#cart-list");
const finalPrice = document.querySelector(".cart-info > p");
let cartJson = JSON.parse(window.localStorage.getItem("cart")) || {};

function addCartItem(id, data) {
    let baseNode = document.createElement("li");
    baseNode.id = "item-" + id;
    baseNode.className = "cart-item";
    let imgNode = document.createElement("img");
    imgNode.src = data.img;
    baseNode.appendChild(imgNode);
    let infoNode = document.createElement("div");
    let nameNode = document.createElement("h3");
    nameNode.className = "cart-item-name";
    nameNode.textContent = data.name;
    infoNode.appendChild(nameNode);
    let priceLabelNode = document.createElement("label");
    priceLabelNode.textContent = "Total Price";
    infoNode.appendChild(priceLabelNode);
    let priceNode = document.createElement("p");
    priceNode.className = "cart-item-price";
    priceNode.textContent = "€" + data.totalPrice.toFixed(2);
    infoNode.appendChild(priceNode);
    let spaceFirstNode = document.createElement("br");
    infoNode.appendChild(spaceFirstNode);
    let SeatsLabelNode = document.createElement("label");
    SeatsLabelNode.textContent = "Seats";
    infoNode.appendChild(SeatsLabelNode);
    let numberNode = document.createElement("input");
    numberNode.id = "input-" + id;
    numberNode.className = "cart-item-number";
    numberNode.type = "number";
    numberNode.value = data.number.toString();
    numberNode.min = 1;
    infoNode.appendChild(numberNode);
    let spaceSecondNode = document.createElement("br");
    infoNode.appendChild(spaceSecondNode);
    let removeNode = document.createElement("div");
    removeNode.className = "cart-item-remove";
    let removeIconNode = document.createElement("img");
    removeIconNode.src = "../../img/shared/pav-trash.svg";
    removeNode.appendChild(removeIconNode);
    let removeLabelNode = document.createElement("p");
    removeLabelNode.textContent = "Remove";
    removeNode.appendChild(removeLabelNode);
    infoNode.appendChild(removeNode);
    baseNode.appendChild(infoNode);
    baseNode.style.display = refreshCart(data.number);
    return baseNode;
}

function refreshCart(number) {
    refreshTotalPrice();
    return number > 0 ? "flex": "none";
}

function refreshTotalPrice() {
    let price = 0;
    for (const cartJsonKey in cartJson) {
        price += cartJson[cartJsonKey].totalPrice;
    }
    finalPrice.textContent = "€ " + price.toFixed(2);
}

function refreshCartCount() {
    let count = 0;
    for (const cartJsonKey in cartJson) {
        if (cartJson[cartJsonKey].number !== 0)
            count++;
    }
    document.querySelector("#cart-container > header > p").textContent = count > 0 ? count.toString() + " item in your Cart" : "0 item in your Cart";
}

window.onload = function () {
    refreshTotalPrice();
    refreshCartCount();
    for (const cartJsonKey in cartJson) {
        cartList.appendChild(addCartItem(Number(cartJsonKey), cartJson[cartJsonKey]));
        document.querySelector("#item-" + cartJsonKey + " > div > .cart-item-number").addEventListener("click", () => {
            refreshTotalPrice();
            cartJson[cartJsonKey].number = Number(document.getElementById("input-" + cartJsonKey).value);
            cartJson[cartJsonKey].totalPrice = cartJson[cartJsonKey].number * cartJson[cartJsonKey].price;
            refreshCartCount();
            document.querySelector("#item-" + cartJsonKey + " > div > .cart-item-price").textContent = "€" + cartJson[cartJsonKey].totalPrice.toFixed(2);
        });
        document.querySelector( "#item-" + cartJsonKey + " > div > .cart-item-remove").addEventListener("click", () => {
            cartJson[cartJsonKey].number = 0;
            cartJson[cartJsonKey].totalPrice = 0;
            refreshCartCount();
            document.getElementById("item-" + cartJsonKey).style.display = refreshCart(0);
        });
    }
    document.querySelector("#cart-container > header > img").addEventListener("click", () => {
        window.localStorage.setItem("cart", JSON.stringify(cartJson));
        console.log(JSON.stringify(cartJson));
        window.location.href = "./dinner.html";
    });
}