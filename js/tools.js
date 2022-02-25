const header = document.querySelector("header");
const images = document.querySelectorAll("header > div > img");
const l2d = document.querySelector(".live2d");

let startingPoint;
let app = new PIXI.Application({ view: l2d, transparent: true, autoStart: true });
let model = PIXI.live2d.Live2DModel.fromSync("../model/Diana.model3.json");

header.addEventListener('mouseenter', (event) => {
    startingPoint = event.clientX;
    header.classList.add('moving');
});

header.addEventListener('mouseout', () => {
    header.classList.remove('moving');
    header.style.setProperty('--percentage', 0.5);
});

header.addEventListener('mousemove', (event) => {
    let percentage = (event.clientX - startingPoint) / window.outerWidth + 0.5;
    header.style.setProperty('--percentage', percentage);
});

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