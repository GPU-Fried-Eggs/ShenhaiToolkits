const menu = document.querySelector("#nav-menu");
const backGround = document.querySelector("#nav-background");
const underLine = document.querySelectorAll(".nav-underline");
const ul = document.querySelector(".nav-ul");
const li = ul.querySelectorAll("li");
let onMenu = false, onTop = true;

let language = function getCookie(name) {
    let cookieArr = document.cookie.split(";");
    for (let i = 0; i < cookieArr.length; i++) {
        let cookiePair = cookieArr[i].split("=");
        if (name === cookiePair[0].trim())
            return decodeURIComponent(cookiePair[1]);
    }
    return null;
}("lan");

language = !language ? navigator.language.substring(0, 2) : language;

const switchLanguage = () => {
    language = (language === "zh") ? "en" : "zh";
}

/* get all DOM elements -> analyse -> check data -> make string -> remove -> render */
class LanguageRender {
    constructor(option) {
        this.option = option;
        this.lan = option.lan;
        this.beforeRender = option.beforeRender || function () {};
        //判断el是否是数组，即判断是否需要渲染多个包裹元素下的dom
        if (Object.prototype.toString.call(option.el) === '[object Array]') {
            this.elArray = option.el;
        } else {
            this.el = document.querySelectorAll(option.el);
        }
        this.dep = new Dep();
        this.beforeRender();
        this.dataInit();
        this.render();
    }

    //由于传进来的文字信息是数组，所以这里需要对数组根据this.lan值进行选择语言，并赋值给this.data
    dataInit() {
        let o = JSON.parse(JSON.stringify(this.option.data)); //深拷贝对象，避免污染变量，方便后面切换中英文使用
        this.dataProcessing(o);
        this.data = o;
    }

    dataProcessing(data) {
        for (let key in data) {
            let item = data[key];
            if (Object.prototype.toString.call(item) === '[object Array]') {
                data[key] = item[this.lan];
            } else if (Object.prototype.toString.call(item) === '[object Object]') {
                this.dataProcessing(item);
            }
        }
    }

    render() {
        if (this.elArray) {
            for (let i = 0; i < this.elArray.length; i++) {
                let el = document.querySelectorAll(this.elArray[i]);
                if (el.length === 1) {
                    this.init(el[0]);
                } else {
                    el.forEach(item => {
                        this.init(item);
                    });
                }
            }
        } else if (this.el) {
            this.el.forEach(item => {
                this.init(item);
            });
        }
    }

    init(el) {
        this.fragment = this.nodeToFragment(el); //将el内的元素临时放入fragment中
        this.compileNode(this.fragment); //对fragment中的元素进行解析
        el.appendChild(this.fragment); //将fragment中的元素重新渲染到页面上
    }

    nodeToFragment(el) {
        let fragmentWrapper = document.createElement("div");
        let child = el.firstChild;
        while (child) { //遍历el内的元素
            // 将Dom元素移入fragment中，由于dom是传址，所以页面上的dom会消失，临时转移到创建的fragmentWrapper中，为了兼容IE8只能创建一个div
            fragmentWrapper.appendChild(child);
            child = el.firstChild;
        }
        return fragmentWrapper;
    }

    compileNode(el) {
        //childNodes是获取dom节点，不光光是html元素节点，还包括了获取文本节点
        //childNodes只是一个类集合，不是数组，需要进行转换
        let childNodes = convertListToArray(el.childNodes);
        for (let i = childNodes.length - 1; i >= 0; i--) {
            let self = this;
            let node = childNodes[i];

            if (self.isElementNode(node)) { //处理元素节点
                self.compileElement(node);
            }

            //处理子节点，递归
            if (node.childNodes && node.childNodes.length) {
                self.compileNode(node);
            }
        }
    }

    compileElement(node) {
        let nodeAttrs = convertListToArray(node.attributes);
        for (let i = nodeAttrs.length - 1; i >= 0; i--) {
            let attr = nodeAttrs[i];
            let attrName = attr.name;
            let attrValue = attr.value;
            let dataKey;
            let dataValue;
            let self = this;
            if (self.isDirective(attrName)) { //判断是否是自定义属性 inf-开头
                /*例如:
                inf-text='lab.name'  lab:{name:'sb'}
                attrName为inf-text
                attrValue为lab.name
                _attrName为text
                dataKey为lab->name
                dataValue为sb
                */

                let _attrName = attrName.slice(4);
                let _attrValueArray = attrValue.split('.');
                let len = _attrValueArray.length;
                dataValue = self.data;
                for (let j = 0; j < len; j++) {
                    dataKey = _attrValueArray[j];
                    dataValue = dataValue[dataKey];
                }
                if ('text' === _attrName) { //inf-text为设置改节点内包含的文本节点值,类比jq的$().text
                    self.updateText(node, attrValue, dataValue)
                } else {
                    self.updateStyle(node, _attrName, attrValue, dataValue);
                }
                node.removeAttribute(attrName);
            }
        }
    }

    updateText(node, attrValue, text) {
        this.updateTextCallBack(node, attrValue, text);
        let languageRender = this;
        new Watcher(languageRender, attrValue, function (value) {
            languageRender.updateTextCallBack(node, attrValue, value);
        });
    }

    //将对node的具体操作单独作为一个callback拿出来，避免多次new Watcher，每一个自定义属性只new一个Watcher
    updateTextCallBack(node, attrValue, text) {
        if (node.textContent !== undefined) {
            node.textContent = text;
        } else {
            node.innerText = text; //兼容IE8
        }
    }

    updateStyle(node, attr, key, val) {
        this.updateStyleCallBack(node, attr, key, val);
        let languageRender = this;
        new Watcher(languageRender, key, function (value, oldValue) {
            languageRender.updateStyleCallBack(node, attr, key, value, oldValue);
        });
    }

    updateStyleCallBack(node, attr, key, val, oldValue) {
        if ('class' === attr) {
            if (node.classList) {
                node.classList['add'](val);
                node.classList['remove'](oldValue);
            } else { //兼容IE8
                node.className = node.className.replace(oldValue, '');
                node.className += ' ' + val;
            }
        } else {
            node.setAttribute(attr, val);
        }
    }

    //判断是否是元素节点
    isElementNode(node) {
        return node.nodeType === 1;
    }

    //判断是否是自定义属性，即指令
    isDirective(attr) {
        return attr.indexOf('inf-') === 0;
    }

    //单独修改某个数据所提供的接口,例如languageRenderCtx.set('languageData.lab.a','xxx');
    set(key, val) {
        let keyArray = key.split('.');
        let data = this.data;
        for (let i = 0; i < keyArray.length; i++) {
            if (i < keyArray.length - 1) {
                data = data[keyArray[i]];
            } else {
                data[keyArray[i]] = val;
            }
        }
        this.dep.notify();
    }

    //修改全部语言选择所提供的接口 lan:0英文 lan:1中文
    setLan(lan) {
        if (this.lan === lan) return;
        this.lan = lan;
        this.dataInit();
        this.dep.notify();
    }
}

// flat nodeList to array，support IE8
function convertListToArray(nodes) {
    let array;
    try {
        array = Array.prototype.slice.call(nodes, 0);
    } catch (ex) {
        array = [];
        for (let i = 0, len = nodes.length; i < len; i++) {
            array.push(nodes[i]);
        }
    }
    return array;
}

// 消息订阅器Dep，订阅器Dep主要负责收集订阅者，然后再属性变化的时候执行对应订阅者的更新函数
class Dep {
    constructor() {
        this.subs = [];
    }

    addSub(sub) {
        this.subs.push(sub);
    }

    // 通知订阅者数据变更
    notify() {
        this.subs.forEach(sub => sub.update());
    }
}

//订阅者Watcher，每一个节点上的每一个自定义属性就是一个订阅者，等待Dep通知，执行cb从而更新ui
class Watcher {
    constructor(languageRenderCtx, key, cb) {
        this.languageRenderCtx = languageRenderCtx;
        this.cb = cb;
        this.key = key;
        this.value = this.get();
        this.languageRenderCtx.dep.addSub(this);
    }

    update() {
        this.run();
    }

    run() {
        let value = this.get();
        let oldVal = this.value;
        if (value !== oldVal) {
            this.value = value;
            this.cb.call(this.languageRenderCtx, value, oldVal);
        }
    }

    get() {
        let keyArray = this.key.split('.');
        let value = this.languageRenderCtx.data;
        for (let i = 0; i < keyArray.length; i++) {
            value = value[keyArray[i]]
        }
        return value;
    }
}

menu.addEventListener("click", () => {
    backGround.style.animation = onTop ? onMenu ? "fadeOut 0.5s" : "fadeIn 0.5s" : backGround.style.animation;
    backGround.style.animationFillMode = "forwards";
    onMenu = !onMenu;
    ul.classList.toggle("open");
    li.forEach((item, index) => {
        item.style.animation = item.style.animation ? "" : `slideIn 0.3s ease-in forwards ${index * 0.1 + 0.3}s`;
    });
});

for (let i = 0; i < li.length; i++) {
    li[i].index = i;
    li[i].addEventListener("mouseover", function () {
        underLine[this.index].style.width = '100%';
    });
    li[i].addEventListener("mouseout", function () {
        underLine[this.index].style.width = ''
    });
}

window.LanguageRender = LanguageRender;

window.onscroll = function () {
    onTop = !(document.documentElement.scrollTop || document.body.scrollTop);
    if (!onMenu) {
        backGround.style.animation = onTop ? "fadeOut 0.5s" : "fadeIn 0.5s";
        backGround.style.animationFillMode = "forwards";
    }
}

window.onbeforeunload = function () {
    document.cookie = "lan" + "=" + encodeURIComponent(language) + "; path=/ShenhaiToolkits/page";
}