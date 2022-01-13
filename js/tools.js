const l2d = document.querySelector(".live2d");
const content = document.querySelector(".content");
const texts = ["Tool", "JavaScript", "CSS", "Mouse", "WebGL",
               "Tool", "JavaScript", "CSS", "Mouse", "WebGL",
               "Tool", "JavaScript", "CSS", "Mouse", "WebGL"];

class TagCloud {
    constructor(container = document.body, texts, options) {
        const self = this;
        if (!container || container.nodeType !== 1) return new Error('Incorrect element type');

        self.$container = container;
        self.texts = texts || [];
        self.config = { ...TagCloud._defaultConfig, ...options || {} };

        self.radius = self.config.radius; // rolling radius
        self.depth = 2 * self.radius; // rolling depth
        self.size = 1.5 * self.radius; // rolling area size with mouse
        self.maxSpeed = TagCloud._getMaxSpeed(self.config.maxSpeed); // rolling max speed
        self.initSpeed = TagCloud._getInitSpeed(self.config.initSpeed); // rolling init speed
        self.direction = self.config.direction; // rolling init direction
        self.keep = self.config.keep; // whether to keep rolling after mouse out area
        self.paused = false; // keep state to pause the animation

        self._createElment();
        self._init();

        TagCloud.list.push({ el: self.$el, container, instance: self });
    }

    static list = [];

    static _defaultConfig = {
        radius: 100, // rolling radius, unit `px`
        maxSpeed: 'normal', // rolling max speed, optional: `slow`, `normal`(default), `fast`
        initSpeed: 'normal', // rolling init speed, optional: `slow`, `normal`(default), `fast`
        direction: 135, // rolling init direction, unit clockwise `deg`, optional: `0`(top) , `90`(left), `135`(right-bottom)(default)...
        keep: true, // whether to keep rolling after mouse out area, optional: `false`, `true`(default)(decelerate to rolling init speed, and keep rolling with mouse)
        useContainerInlineStyles: true,
        useItemInlineStyles: true,
        containerClass: 'tagcloud',
        itemClass: 'tagcloud--item'
    };

    static _getMaxSpeed = (name) => ({ slow: 0.5, normal: 1, fast: 2 })[name] || 1;
    static _getInitSpeed = (name) => ({ slow: 16, normal: 32, fast: 80 })[name] || 32;

    static _on(el, ev, handler, cap) {
        if (el.addEventListener) {
            el.addEventListener(ev, handler, cap);
        } else if (el.attachEvent) {
            el.attachEvent(`on${ev}`, handler);
        } else {
            el[`on${ev}`] = handler;
        }
    }

    _createElment() {
        const self = this;

        const $el = document.createElement('div');
        $el.className = self.config.containerClass;
        if (self.config.useContainerInlineStyles) {
            $el.style.position = 'relative';
            $el.style.width = `${2 * self.radius}px`;
            $el.style.height = `${2 * self.radius}px`;
        }

        self.items = [];
        self.texts.forEach((text, index) => {
            const item = self._createTextItem(text, index);
            $el.appendChild(item.el);
            self.items.push(item);
        });
        self.$container.appendChild($el);
        self.$el = $el;
    }

    _createTextItem(text, index = 0) {
        const self = this;
        const itemEl = document.createElement('span');
        itemEl.className = self.config.itemClass;
        if (self.config.useItemInlineStyles) {
            itemEl.style.willChange = 'transform, opacity, filter';
            itemEl.style.position = 'absolute';
            itemEl.style.top = '50%';
            itemEl.style.left = '50%';
            itemEl.style.zIndex = index + 1;
            itemEl.style.filter = 'alpha(opacity=0)';
            itemEl.style.opacity = 0;
            const transformOrigin = '50% 50%';
            itemEl.style.WebkitTransformOrigin = transformOrigin;
            itemEl.style.MozTransformOrigin = transformOrigin;
            itemEl.style.OTransformOrigin = transformOrigin;
            itemEl.style.transformOrigin = transformOrigin;
            const transform = 'translate3d(-50%, -50%, 0) scale(1)';
            itemEl.style.WebkitTransform = transform;
            itemEl.style.MozTransform = transform;
            itemEl.style.OTransform = transform;
            itemEl.style.transform = transform;
        }
        itemEl.innerText = text;
        return {
            el: itemEl,
            ...self._computePosition(index), // distributed in appropriate place
        };
    }

    _computePosition(index, random = false) {
        const self = this;
        const textsLength = self.texts.length;
        // if random `true`, It means that a random appropriate place is generated, and the position will be independent of `index`
        if (random) index = Math.floor(Math.random() * (textsLength + 1));
        const phi = Math.acos(-1 + (2 * index + 1) / textsLength);
        const theta = Math.sqrt((textsLength + 1) * Math.PI) * phi;
        return {
            x: (self.size * Math.cos(theta) * Math.sin(phi)) / 2,
            y: (self.size * Math.sin(theta) * Math.sin(phi)) / 2,
            z: (self.size * Math.cos(phi)) / 2,
        };
    }

    _requestInterval(fn, delay) {
        const requestAnimFrame = ((() => window.requestAnimationFrame) || ((callback, element) => {
            window.setTimeout(callback, 1000 / 60);
        }))();
        let start = new Date().getTime();
        const handle = {};
        function loop() {
            handle.value = requestAnimFrame(loop);
            const current = new Date().getTime(),
                delta = current - start;
            if (delta >= delay) {
                fn.call();
                start = new Date().getTime();
            }
        }
        handle.value = requestAnimFrame(loop);
        return handle;
    }

    _init() {
        const self = this;

        self.active = false; // whether the mouse is activated

        self.mouseX0 = self.initSpeed * Math.sin(self.direction * (Math.PI / 180)); // init distance between the mouse and rolling center x axis
        self.mouseY0 = -self.initSpeed * Math.cos(self.direction * (Math.PI / 180)); // init distance between the mouse and rolling center y axis

        self.mouseX = self.mouseX0; // current distance between the mouse and rolling center x axis
        self.mouseY = self.mouseY0; // current distance between the mouse and rolling center y axis

        // mouseover
        TagCloud._on(self.$el, 'mouseover', () => { self.active = true; });
        // mouseout
        TagCloud._on(self.$el, 'mouseout', () => { self.active = false; });
        // mousemove
        TagCloud._on(self.keep ? window : self.$el, 'mousemove', (ev) => {
            ev = ev || window.event;
            const rect = self.$el.getBoundingClientRect();
            self.mouseX = (ev.clientX - (rect.left + rect.width / 2)) / 5;
            self.mouseY = (ev.clientY - (rect.top + rect.height / 2)) / 5;
        });

        // update state regularly
        self._next(); // init update state
        self.interval = self._requestInterval(() => {
            self._next.call(self);
        }, 10);
    }

    _next() {
        const self = this;
        if (self.paused) return;

        // if keep `false`, pause rolling after moving mouse out area
        if (!self.keep && !self.active) {
            self.mouseX = Math.abs(self.mouseX - self.mouseX0) < 1
                ? self.mouseX0 : (self.mouseX + self.mouseX0) / 2; // reset distance between the mouse and rolling center x axis
            self.mouseY = Math.abs(self.mouseY - self.mouseY0) < 1
                ? self.mouseY0 : (self.mouseY + self.mouseY0) / 2; // reset distance between the mouse and rolling center y axis
        }

        const a = -(Math.min(Math.max(-self.mouseY, -self.size), self.size) / self.radius) * self.maxSpeed;
        const b = (Math.min(Math.max(-self.mouseX, -self.size), self.size) / self.radius) * self.maxSpeed;

        if (Math.abs(a) <= 0.01 && Math.abs(b) <= 0.01) return; // pause

        const l = Math.PI / 180;
        const sc = [
            Math.sin(a * l),
            Math.cos(a * l),
            Math.sin(b * l),
            Math.cos(b * l)
        ];

        self.items.forEach(item => {
            const rx1 = item.x;
            const ry1 = item.y * sc[1] + item.z * (-sc[0]);
            const rz1 = item.y * sc[0] + item.z * sc[1];

            const rx2 = rx1 * sc[3] + rz1 * sc[2];
            const ry2 = ry1;
            const rz2 = rz1 * sc[3] - rx1 * sc[2];

            const per = (2 * self.depth) / (2 * self.depth + rz2); // todo

            item.x = rx2;
            item.y = ry2;
            item.z = rz2;
            item.scale = per.toFixed(3);
            let alpha = per * per - 0.25;
            alpha = (alpha > 1 ? 1 : alpha).toFixed(3);

            const itemEl = item.el;
            const left = (item.x - itemEl.offsetWidth / 2).toFixed(2);
            const top = (item.y - itemEl.offsetHeight / 2).toFixed(2);
            const transform = `translate3d(${left}px, ${top}px, 0) scale(${item.scale})`;
            itemEl.style.WebkitTransform = transform;
            itemEl.style.MozTransform = transform;
            itemEl.style.OTransform = transform;
            itemEl.style.transform = transform;
            itemEl.style.filter = `alpha(opacity=${100 * alpha})`;
            itemEl.style.opacity = alpha;
        });
    }

    update(texts) {
        const self = this;
        self.texts = texts || [];
        self.texts.forEach((text, index) => {
            let item = self.items[index];
            if (!item) { // if not had, then create
                item = self._createTextItem(text, index);
                Object.assign(item, self._computePosition(index, true)); // random place
                self.$el.appendChild(item.el);
                self.items.push(item);
            }
            item.el.innerText = text;
        });
        const textsLength = self.texts.length;
        const itemsLength = self.items.length;
        if (textsLength < itemsLength) {
            const removeList = self.items.splice(textsLength, itemsLength - textsLength);
            removeList.forEach(item => {
                self.$el.removeChild(item.el);
            });
        }
    }

    destroy() {
        const self = this;
        self.interval = null;
        const index = TagCloud.list.findIndex(e => e.el === self.$el);
        if (index !== -1) TagCloud.list.splice(index, 1);
        if (self.$container && self.$el) {
            self.$container.removeChild(self.$el);
        }
    }

    pause() {
        const self = this;
        self.paused = true;
    }

    resume() {
        const self = this;
        self.paused = false;
    }
}

//初始化pixi
let app = new PIXI.Application({ view: l2d, transparent: true, autoStart: true });
//初始化live2d
let model = PIXI.live2d.Live2DModel.fromSync("../model/Diana.model3.json");

model.once("load", () => {
    const motionManager = model.internalModel.motionManager;
    app.stage.addChild(model); //binding
    model.scale.set(l2d.height / model.height); //cal scale by canvas
    l2d.width = model.width; //match
    l2d.height = model.height;

    model.on("hit", hitAreas => {
        if (hitAreas.includes("Body")) {
            model.motion("Tap")
        } else if (hitAreas.includes("Head")){
            model.expression()
        }
    });

    //add click event to element
    l2d.onclick = function () {
        if (motionManager.state.currentGroup !== "Idle") return;
        let action = touchList[Math.floor(Math.random() * touchList.length + 1) - 1];
        playAction(action);
    }
});

let touchList = [{ text: "嘉心糖屁用没有", motion: "Tap生气 -领结" },
    { text: "有人急了，但我不说是谁~", motion: "Tap= =  左蝴蝶结" },
    { text: "呜呜...呜呜呜....", motion: "Tap哭 -眼角" },
    { text: "想然然了没有呀~", motion: "Tap害羞-中间刘海" },
    { text: "阿草好软呀~", motion: "Tap抱阿草-左手" },
    { text: "不要再戳啦！好痒！", motion: "Tap摇头- 身体" },
    { text: "嗷呜~~~", motion: "Tap耳朵-发卡" },
    { text: "zzZ。。。", motion: "Leave" },
    { text: "哇！好吃的！", motion: "Tap右头发" }];

function playAction(action) {
    /*action.text && function (text) {
        if (text.constructor === Array) { dialog.innerHTML = modules.rand(text); }
        else if (text.constructor === String) { dialog.innerHTML = text; }
        else { dialog.innerHTML = "Erro Message X_X"; }
        dialog.classList.add("active");
        clearTimeout(this.t);
        this.t = setTimeout(function () { dialog.classList.remove("active"); }, 3000);
    }*/
    action.motion && model.motion(action.motion)

    if (action.from && action.to) {
        Object.keys(action.from).forEach(id => {
            const hidePartIndex = coreModel._partIds.indexOf(id)
            TweenLite.to(coreModel._partOpacities, 0.6, { [hidePartIndex]: action.from[id] }); // cache
        });
        motionManager.once("motionFinish", () => {
            Object.keys(action.to).forEach(id => {
                const hidePartIndex = coreModel._partIds.indexOf(id);
                TweenLite.to(coreModel._partOpacities, 0.6, { [hidePartIndex]: action.to[id] });
            })
        });
    }
}

window.onload = function () {
    let tc = new TagCloud(content, texts, {radius: 155});
}