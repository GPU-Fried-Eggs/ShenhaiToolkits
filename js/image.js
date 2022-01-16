const holder = document.querySelector("#waterfall");

class Lightbox {
    // https://github.com/tflins/lightbox/blob/master/src/assest/css/lightbox.css
    constructor() {
        let self = this;

        // 创建遮罩层和弹出层
        this.popupMask = document.createElement("div");
        this.popupWin = document.createElement("div");

        this.bodyNode = document.body;
        this.bodyNode.onclick = function(event) {
            let target = event.target;
            if (target.nodeName.toLowerCase() === "img" && target.getAttribute("data-rote") === "lightbox") {
                event.stopPropagation(); // 阻止事件冒泡
                self.showMaskAndPopup(target.getAttribute("data-src")); // 初始化弹出层
            }
        }

        this.popupMask.setAttribute("id", "lightbox-mask");
        this.popupWin.setAttribute("id", "lightbox-popup");
        this.popupWin.innerHTML = "<div class='lightbox-pic-view'>" + "<img class='lightbox-image' src='#' alt='Image'>" + "</div>";
        this.bodyNode.appendChild(this.popupMask);
        this.bodyNode.appendChild(this.popupWin);

        this.picViewArea = document.querySelector("#lightbox-popup .lightbox-pic-view"); // 图片预览区
        this.popupPic = document.querySelector("#lightbox-popup .lightbox-image"); // 图片

        // 点击遮罩层关闭其与弹出层
        this.popupMask.onclick = function() {
            this.style.display = "none";
            self.popupWin.style.display = "none";
        }
        this.popupWin.onclick = function() {
            this.style.display = "none";
            self.popupMask.style.display = "none";
        }
    }
    showMaskAndPopup(sourceSrc) {
        let self = this,
            winHeight = document.documentElement.clientHeight, // 可见窗口宽度
            winWidth = document.documentElement.clientWidth, // 可见窗口高度
            viewHeight = winHeight / 2 + 10; // 当前弹出层高度
        // 隐藏相关区域
        this.popupPic.style.display = "none";
        // 设置图片预览区宽高
        this.picViewArea.style.width = winWidth / 2 + "px";
        this.picViewArea.style.height = winHeight / 2 + "px";
        // 显示相关区域
        this.popupMask.style.display = "block";
        this.popupWin.style.display = "block";
        // 设置弹出层宽高位置
        this.popupWin.style.width = winWidth / 2 + 10 + "px";
        this.popupWin.style.height = winHeight / 2 + 10 + "px";
        this.popupWin.style.marginLeft = -(winWidth / 2 + 10) / 2 + "px";
        // 初始化弹出层top值
        this.popupWin.style.top = -viewHeight + "px";
        // 启动定时器调整top的值
        let top = viewHeight;
        let changeTop = setInterval(function() {
            top = top - 15;
            self.popupWin.style.top = -top + "px";
            if (-top >= (winHeight - viewHeight) / 2) {
                clearInterval(changeTop);
                self.loadPicSize(sourceSrc); // 加载图片尺寸
            }
        }, 1);
    }
    loadPicSize(sourceSrc) {
        let self = this
        // 清楚上一次获取图片的宽高
        this.popupPic.style.width = "auto";
        this.popupPic.style.height = "auto";
        // 隐藏上一次图片，防止出现较差的视觉效果
        this.popupPic.style.display = "none";
        // 预加载图片
        this.preLoadImg(sourceSrc, function() {
            self.popupPic.setAttribute("src", sourceSrc);
            // 图片的宽高
            let picWidth = self.popupPic.width,
                picHeight = self.popupPic.height;
            self.changePopup(picWidth, picHeight); // 改变弹出层的宽高
        });
    }
    preLoadImg(sourceSrc, callback) {
        let img = new Image();
        img.onload = function() { callback(); }
        img.src = sourceSrc;
    }
    changePopup(picWidth, picHeight) {
        let self = this,
            winHeight = document.documentElement.clientHeight, // 可见窗口宽度
            winWidth = document.documentElement.clientWidth; // 可见窗口高度
        // 如果图片的宽高大于浏览器可视区域
        let scale = Math.min(winWidth / (picWidth + 10), winHeight / (picHeight + 10), 1);
        picWidth = picWidth * scale;
        picHeight = picHeight * scale;
        // 调用animate方法使改变图片预览区宽高有过度效果
        this.animate(this.picViewArea,
            { width: Math.floor(picWidth - 10), height: Math.floor(picHeight - 10) },
            10, 0.5,
            function() { }
        );
        this.animate(this.popupWin,
            { width: Math.floor(picWidth), height: Math.floor(picHeight), marginLeft: -Math.floor(picWidth / 2), top: Math.floor((winHeight - picHeight) / 2) },
            10, 0.5,
            function() {
                self.popupPic.style.width = picWidth + "px";
                self.popupPic.style.display = "block"; // 显示图片区域和图片描述区域
            }
        );
    }
    animate(obj, css, interval, speedFactor, func) {
        clearInterval(obj.timer);
        obj.timer = setInterval(function() {
            let flag = true;
            for (let prop in css) {
                let getStyle = (obj, prop) => document.defaultView.getComputedStyle(obj, null)[prop];
                let cur = prop === "opacity" ? Math.round(parseFloat(getStyle(obj, prop)) * 100) : parseInt(getStyle(obj, prop));
                let speed = (css[prop] - cur) * speedFactor;
                speed = speed > 0 ? Math.ceil(speed) : Math.floor(speed);
                if (cur !== css[prop]) flag = false;
                if (prop === "opacity") {
                    obj.style.filter = "alpha(opacity : '+(cur + speed)+' )";
                    obj.style.opacity = (cur + speed) / 100;
                } else {
                    obj.style[prop] = cur + speed + "px";
                }
            }
            if (flag) {
                clearInterval(obj.timer);
                if (func) func();
            }
        }, interval);
    }
}

window.onload = function () {
    let loading = false;
    let num = 0;
    const refresh = function (width, onStart, onEnd) {
        if (onStart != null) onStart();
        if (holder != null) {
            holder.style.position = "relative";
            const childNodes = holder.childNodes;
            if (childNodes.length > 0) {
                const holderWidth = holder.offsetWidth;
                let column = parseInt(holderWidth / width);
                if (childNodes.length < column)
                    column = childNodes.length;
                let liLeft = (holderWidth - column * width) / 2;
                if (column > 0) {
                    holder.className = "";
                    let maxHeight = 0;
                    let items = [], newItems = [];
                    childNodes.forEach((li, i) => items.push({index: i, bottom: 0, height: li.offsetHeight}));
                    for (let i = 0; i < column; i++) { newItems.push([]); }
                    items.forEach((item, i) => {
                        if (i < column) {
                            item.bottom = item.height;
                            newItems[i].push(item);
                        } else {
                            let bottom = 0, left = 0;
                            for (let j = 0; j < column; j++) {
                                const jHeight = newItems[j][newItems[j].length - 1].bottom + item.height;
                                if (bottom === 0 || jHeight < bottom) {
                                    bottom = jHeight; left = j;
                                }
                            }
                            item.bottom = bottom;
                            newItems[left].push(item);
                        }
                    });
                    for (let i = 0; i < newItems.length; i++) {
                        for (let j = 0; j < newItems[i].length; j++) {
                            childNodes[newItems[i][j].index].style.left = i * width + liLeft + "px";
                            childNodes[newItems[i][j].index].style.top = newItems[i][j].bottom - newItems[i][j].height + "px";
                            childNodes[newItems[i][j].index].style.width = width + "px";
                            childNodes[newItems[i][j].index].style.position = "absolute";
                        }
                        const height = newItems[i][newItems[i].length - 1].bottom;
                        if (maxHeight < height)
                            maxHeight = height;
                    }
                    holder.style.height = maxHeight + "px";
                } else {
                    holder.setAttribute("style", "");
                    childNodes.forEach(li => li.setAttribute("style", ""));
                    holder.className = "min";
                }
                childNodes.forEach(li => li.className = document.scrollingElement.scrollTop + window.innerHeight > li.offsetTop ? "show" : li.className);
            }
        }
        if (onEnd != null) onEnd();
    };
    setInterval(refresh, 45, 320, () => {
        if (!loading && document.scrollingElement.scrollTop + window.innerHeight > document.body.scrollHeight - window.innerHeight / 2) {
            loading = true;
            for (let i = num; i < num + 10; i++) {
                const li = document.createElement("li");
                const div = document.createElement("div");
                const img = document.createElement("img");
                img.src = "../img/gallery/" + i % 50 + ".jpg";
                img.setAttribute("data-rote", "lightbox");
                img.setAttribute("data-src", img.src);
                div.appendChild(img);
                li.appendChild(div);
                holder.appendChild(li);
            }
            num += 10;
            loading = false;
        }}, () => { }
    );
    new Lightbox();
}
