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
const cartPage = document.querySelector("#cart-container");
const finalPrice = document.querySelector(".cart-info > p");
const path = "../../js/tools/res/dinner_data.json"; // limitation, page is static, the possibility of save cart could be cookie
let dataBaseArray = Array(); // TODO: move to cookie?

class Item {
    constructor(imgPath, name, price, info, number = 0) {
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
        baseNode.setAttribute("class", "item");
        let imgNode = document.createElement("img");
        imgNode.setAttribute("src", this.imgPath);
        imgNode.addEventListener("click", () => {
            this.refreshDetail();
        });
        baseNode.appendChild(imgNode);
        let describeNode = document.createElement("div");
        describeNode.setAttribute("class", "item-describe");
        let nameNode = document.createElement("a");
        nameNode.setAttribute("class", "item-name");
        nameNode.appendChild(document.createTextNode(this.name));
        describeNode.appendChild(nameNode);
        let priceNode = document.createElement("p");
        priceNode.setAttribute("class", "item-price");
        priceNode.appendChild(document.createTextNode("€" + this.price));
        describeNode.appendChild(priceNode);
        let cartNode = document.createElement("a");
        cartNode.setAttribute("class", "item-cart");
        cartNode.appendChild(document.createTextNode("Add to Cart"));
        cartNode.addEventListener("click", () => {
            this.number++;
            this.numberNode.value = this.number;
            this.cartNode.style.display = this.refreshCart();
            refreshCartCount();
            this.totalPriceNode.innerText = "€" + (this.price * this.number).toFixed(2);
            console.log("add " + this.name + this.number);
        });
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
        baseNode.setAttribute("class", "cart-item");
        let imgNode = document.createElement("img");
        imgNode.setAttribute("src", this.imgPath);
        baseNode.appendChild(imgNode);
        let infoNode = document.createElement("div");
        let nameNode = document.createElement("h3");
        nameNode.setAttribute("class", "cart-item-name");
        nameNode.appendChild(document.createTextNode(this.name));
        infoNode.appendChild(nameNode);
        let priceLabelNode = document.createElement("label");
        priceLabelNode.appendChild(document.createTextNode("Total Price"));
        infoNode.appendChild(priceLabelNode);
        let priceNode = document.createElement("p");
        priceNode.setAttribute("class", "cart-item-price");
        priceNode.appendChild(document.createTextNode("€" + (this.price * this.number).toFixed(2)));
        this.totalPriceNode = priceNode;
        infoNode.appendChild(priceNode);
        let spaceFirstNode = document.createElement("br");
        infoNode.appendChild(spaceFirstNode);
        let SeatsLabelNode = document.createElement("label");
        SeatsLabelNode.appendChild(document.createTextNode("Seats"));
        infoNode.appendChild(SeatsLabelNode);
        let numberNode = document.createElement("input");
        numberNode.setAttribute("class", "cart-item-number");
        numberNode.setAttribute("type", "number");
        numberNode.setAttribute("value", this.number.toString());
        numberNode.addEventListener("input", () => {
            refreshTotalPrice();
            this.number = this.numberNode.value;
            refreshCartCount();
            this.totalPriceNode.innerText = "€" + (this.price * this.number).toFixed(2);
        });
        numberNode.setAttribute("min", "1");
        this.numberNode = numberNode;
        infoNode.appendChild(this.numberNode);
        let spaceSecondNode = document.createElement("br");
        infoNode.appendChild(spaceSecondNode);
        let removeNode = document.createElement("div");
        removeNode.setAttribute("class", "cart-item-remove");
        let removeIconNode = document.createElement("img");
        removeIconNode.setAttribute("src", "../../img/shared/pav-trash.svg");
        removeNode.appendChild(removeIconNode);
        let removeLabelNode = document.createElement("p");
        removeLabelNode.appendChild(document.createTextNode("Remove"));
        removeNode.appendChild(removeLabelNode);
        removeNode.addEventListener("click", () => {
            this.number = 0;
            this.numberNode.value = this.number;
            refreshCartCount();
            this.cartNode.style.display = this.refreshCart();
        });
        infoNode.appendChild(removeNode);
        baseNode.appendChild(infoNode);
        this.cartNode = baseNode;
        this.cartNode.style.display = this.refreshCart();
        return baseNode;
    }

    refreshDetail() {
        document.getElementById("detail-img").src = this.imgPath;
        document.getElementById("detail-name").innerText = this.name.toString();
        document.getElementById("detail-price").innerText = "€ " + this.price.toFixed(2);
        document.getElementById("detail-description").innerText = this.info;
        document.querySelector("#detail-info > div > button").addEventListener("click", () => {
            this.number++;
            this.numberNode.value = this.number;
            this.cartNode.style.display = this.refreshCart();
            refreshCartCount();
            this.totalPriceNode.innerText = "€" + (this.price * this.number).toFixed(2);
            console.log("add " + this.name + this.number);
        });
        detailPage.style.display = "block";
    }

    refreshCart() {
        refreshTotalPrice();
        return this.number > 0 ? "flex": "none";
    }
}

const refreshCartCount = () => {
    let count = 0;
    dataBaseArray.forEach(item => {
        if (item.number !== 0)
            count++;
    });
    document.querySelector("#cart > p").textContent = count > 0 ? count.toString() : "";
}

const refreshTotalPrice = () => {
    let price = 0;
    dataBaseArray.forEach(item => price += item.totalPrice);
    finalPrice.textContent = "€ " + price.toFixed(2);
}

window.onload = function () {
    cartPage.style.display = "none";
    detailPage.style.display = "none";
    document.querySelector("#cart").addEventListener("click", () => {
        cartPage.style.display = "grid";
    });
    document.querySelector("#cart-container > header > img").addEventListener("click", () => {
        cartPage.style.display = "none";
    });
    document.querySelector("#detail-container > header > img").addEventListener("click", () => {
        detailPage.style.display = "none";
    });
    fetch(path).then(response => response.json().then(dinner => {
        let data = dinner.data;
        data.forEach(item => {
            let obj = new Item(item.img, item.name, item.price, item.info);
            dataBaseArray.push(obj);
            itemList.appendChild(obj.itemPrefab);
            cartList.appendChild(obj.cartPrefab);
        });
    }));

}

