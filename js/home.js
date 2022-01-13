const labelContent = document.querySelector(".label-content");
const text = document.querySelector(".scroll-text");
const column = document.querySelectorAll(".column");
const columnStage = document.querySelectorAll(".column-stage");
const labelText = ["jQuery", "Cookie", "HTTP", "flex Layout", "CSS", "Unity", "Svg", "Git", "Live2D", "Music",];
const scrollText = "この程度の不幸なんて、まだ始まりに過ぎないのよ。";
let index = 1;
let speed = 300;

labelText.forEach(item => {
    let pObject = document.createElement("p");
    pObject.innerText = item;
    labelContent.appendChild(pObject);
});

labelContent.querySelectorAll("p").forEach(item => {
    item.style.color = "rgba(" + parseInt(Math.random() * 256) + "," + parseInt(Math.random() * 256) + "," + parseInt(Math.random() * 256) + ",1)";
});

if (columnStage) {
    let windowWidth = document.documentElement.clientWidth || document.body.clientWidth;
    if (windowWidth <= 1080) {
        for (let i = 0; i < columnStage.length; i++) {
            columnStage[i].classList.remove("column-stage");
        }
    }
}

ScrollReveal().reveal("header", {
    distance: '100px',
    duration: 1000,
    easing: 'ease-out',
    interval: 100,
    opacity: 0,
    origin: 'top',
});

ScrollReveal().reveal("section", {
    distance: '100px',
    duration: 1000,
    easing: 'ease-out',
    interval: 100,
    opacity: 0,
    origin: 'bottom',
    reset: true,
    afterReveal: function () {
        ScrollReveal().clean("section");
    }
});

ScrollReveal().reveal(".right-scroll",{
    distance:'100px',
    duration:1000,
    easing:'ease-out',
    interval:100,
    opacity:0,
    origin:'bottom',
});

window.onload = function () {
    (function textHorizontalScroll() {
        let array = [];
        for (let i = 0; i < index; i++) {
            array.push(scrollText[i]);
        }
        text.innerText = array.join("");
        index++;
        index = (index > scrollText.length) ? 1 : index;
        setTimeout(textHorizontalScroll, speed);
    }());
};

window.onresize = function () {
    let windowWidth = document.documentElement.clientWidth || document.body.clientWidth;
    if (windowWidth <= 1080) {
        for (let i = 0; i < column.length; i++) {
            column[i].classList.remove("column-stage");
        }
    } else {
        for (let i = 0; i < column.length; i++) {
            column[i].classList.add("column-stage");
        }
    }
}
