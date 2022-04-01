/**
 * Requirement
 * - Add product to shopping cart from product detail view or product list view
 * - Show correct sum of price of the items in shopping cart
 * - Add and remove products from shopping cart in shopping cart view and update the price information accordingly
 * - Products in shopping cart should be kept even if the user changes views, but not when reload operation in the browser is used.
 * - Product information is loaded from JSON data instead of hardcoded HTML
 */

const itemList = document.querySelector(".item-list");
const cartList = document.querySelector("#cart-list");
const detailPage = document.querySelector("#detail-container");
const detailImg = document.getElementById("detail-img");
const detailName = document.getElementById("detail-name");
const detailPrice = document.getElementById("detail-price");
const detailDesc = document.getElementById("detail-description");
const detailBtn = document.querySelector("#detail-info > div > button");
const cartPage = document.querySelector("#cart-container");
const finalPrice = document.querySelector(".cart-info > p");
const path = "../../js/tools/res/dinner_data.json";
let detailTarget = null;
//let dataBaseArray = {};
let cartJson = JSON.parse(window.localStorage.getItem("cart")) || {};

class Item {
    constructor(id, imgPath, name, price, info, number = 0) {
        this.id = id;
        this.imgPath = imgPath;
        this.name = name;
        this.price = price;
        this.info = info;
        this.number = number;
        this.cartNode = {};
        this.totalPriceNode = {};
        this.numberNode = {};
    }

    get totalPrice() {
        return this.number * this.price;
    }

    /**
     * <div class="item">
     *     <img src="../temp.svg" alt="">
     *     <div class="item-describe">
     *         <!--a class="item-market">Market</a-->
     *         <a class="item-name">ItemName</a>
     *         <a class="item-price">23333333333333333333333</a>
     *         <a class="item-cart">Add to Cart</a>
     *     </div>
     * </div>
     */
    get itemPrefab() {
        let baseNode = document.createElement("div");
        baseNode.className = "item";
        let imgNode = document.createElement("img");
        imgNode.src = this.imgPath;
        imgNode.addEventListener("click", () => this.refreshDetail());
        baseNode.appendChild(imgNode);
        let describeNode = document.createElement("div");
        describeNode.className = "item-describe";
        let nameNode = document.createElement("a");
        nameNode.className = "item-name";
        nameNode.textContent = this.name;
        describeNode.appendChild(nameNode);
        let priceNode = document.createElement("p");
        priceNode.className = "item-price";
        priceNode.textContent = "€" + this.price;
        describeNode.appendChild(priceNode);
        let cartNode = document.createElement("a");
        cartNode.className = "item-cart";
        cartNode.textContent = "Add to Cart";
        cartNode.addEventListener("click", () => this.addToCart());
        describeNode.appendChild(cartNode);
        baseNode.appendChild(describeNode);
        return baseNode;
    }

    /**
     * <li class="cart-item">
     *     <img src="/img/tools/dinner_db/juice.png">
     *     <div>
     *         <h3 class="cart-item-name">IteamName</h3>
     *         <label>Total Price</label>
     *         <p class="cart-item-price">2333333333333</p><br>
     *         <label>Seats</label>
     *         <input class="cart-item-number" type="number" min="1"><br>
     *         <div class="cart-item-remove">
     *             <img src="../../img/shared/pav-trash.svg">
     *             <p>Remove</p>
     *         </div>
     *     </div>
     * </li>
     */
    get cartPrefab() {
        let baseNode = document.createElement("li");
        baseNode.className = "cart-item";
        let imgNode = document.createElement("img");
        imgNode.src = this.imgPath;
        baseNode.appendChild(imgNode);
        let infoNode = document.createElement("div");
        let nameNode = document.createElement("h3");
        nameNode.className = "cart-item-name";
        nameNode.textContent = this.name;
        infoNode.appendChild(nameNode);
        let priceLabelNode = document.createElement("label");
        priceLabelNode.textContent = "Total Price";
        infoNode.appendChild(priceLabelNode);
        let priceNode = document.createElement("p");
        priceNode.className = "cart-item-price";
        priceNode.textContent = "€" + (this.price * this.number).toFixed(2);
        this.totalPriceNode = priceNode;
        infoNode.appendChild(priceNode);
        let spaceFirstNode = document.createElement("br");
        infoNode.appendChild(spaceFirstNode);
        let SeatsLabelNode = document.createElement("label");
        SeatsLabelNode.textContent = "Seats";
        infoNode.appendChild(SeatsLabelNode);
        let numberNode = document.createElement("input");
        numberNode.className = "cart-item-number";
        numberNode.type = "number";
        numberNode.value = this.number.toString();
        numberNode.min = 1;
        numberNode.addEventListener("input", () => {
            refreshTotalPrice();
            this.number = this.numberNode.value;
            refreshCartCount();
            this.totalPriceNode.textContent = "€" + (this.price * this.number).toFixed(2);
        });
        this.numberNode = numberNode;
        infoNode.appendChild(this.numberNode);
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
        removeNode.addEventListener("click", () => {
            this.number = 0;
            this.numberNode.value = this.number;
            cartJson[this.id].number = this.number;
            cartJson[this.id].totalPrice = this.totalPrice;
            refreshCartCount();
            this.cartNode.style.display = this.refreshCart();
        });
        infoNode.appendChild(removeNode);
        baseNode.appendChild(infoNode);
        this.cartNode = baseNode;
        this.cartNode.style.display = this.refreshCart();
        return baseNode;
    }

    addToCart() {
        this.number++;
        cartJson[this.id].number = this.number;
        cartJson[this.id].totalPrice = this.totalPrice;
        this.numberNode.value = this.number;
        this.cartNode.style.display = this.refreshCart();
        refreshCartCount();
        this.totalPriceNode.textContent = "€" + (this.price * this.number).toFixed(2);
        console.log("add " + this.name + " " + this.number);
        console.log(cartJson);
    }

    refreshDetail() {
        detailTarget = this;
        detailImg.src = this.imgPath;
        detailName.textContent = this.name.toString();
        detailPrice.textContent = "€ " + this.price.toFixed(2);
        detailDesc.textContent = this.info;
        detailBtn.addEventListener("click", () => { if (detailTarget === this) this.addToCart(); });
        detailPage.style.display = "block";
    }

    refreshCart() {
        refreshTotalPrice();
        return this.number > 0 ? "flex": "none";
    }
}

function refreshCartCount() {
    let count = 0;
    /*
    for (const key in dataBaseArray) {
        if (dataBaseArray[key].number !== 0)
            count++;
    }*/
    for (const cartJsonKey in cartJson) {
        if (cartJson[cartJsonKey].number !== 0)
            count++;
    }
    document.querySelector("#cart > p").textContent = count > 0 ? count.toString() : "";
}

function refreshTotalPrice() {
    let price = 0;
    /*
    for (const key in dataBaseArray) {
        price += dataBaseArray[key].totalPrice;
    }*/
    for (const cartJsonKey in cartJson) {
        price += cartJson[cartJsonKey].totalPrice;
    }
    finalPrice.textContent = "€ " + price.toFixed(2);
}

window.onload = function () {
    cartPage.style.display = "none";
    detailPage.style.display = "none";
    document.querySelector("#cart").addEventListener("click", () => cartPage.style.display = "grid");
    document.querySelector("#cart-container > header > img").addEventListener("click", () => cartPage.style.display = "none");
    document.querySelector("#cart-container > .cart-info > button").addEventListener("click", () => {
        window.localStorage.setItem("cart", JSON.stringify(cartJson));
        console.log(JSON.stringify(cartJson));
        window.location.href = "./dinner.checkout.html";
    });
    document.querySelector("#detail-container > header > img").addEventListener("click", () => detailPage.style.display = "none");
    fetch(path).then(response => response.json().then(dinner => {
        let data = dinner.data;
        data.forEach((item, id) => {
            let obj = new Item(id, item.img, item.name, item.price, item.info);
            cartJson[id] = { name: obj.name, img: obj.imgPath, number: obj.number, price: obj.price, totalPrice: obj.totalPrice }
            //dataBaseArray[id] = obj;
            itemList.appendChild(obj.itemPrefab);
            cartList.appendChild(obj.cartPrefab);
        });
    }));
}