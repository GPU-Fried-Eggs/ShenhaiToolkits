const convert = document.querySelector("#convert");
const drop = document.querySelector("#img-drop");
const inputFile = document.querySelector("#input-file");
const preview = document.querySelector("#img-preview");
const inputImg = preview.querySelector("img");
const inputFN = document.querySelector("#input-file-name");
const inputFT = document.querySelector("#input-file-type");
const inputFU = document.querySelector("#input-file-update");
const inputFS = document.querySelector("#input-file-size");
const inputFR = document.querySelector("#input-file-wh");
const output = document.querySelector("#output-canvas");

let model = null
let imageData, imageStage = false, imageWidth, imageHeight;
let processing = false;

// 走入误区的原因，只思考了拉伸问题没考虑实际状况
// 走出的想法，考虑浮动通过限制绘制

function composeImage(data, width, height) {
    let t = tf.tensor(Array.from(data));
    t = tf.reshape(t, [1, height, width, 4]);
    t = tf.transpose(t, [0, 3, 1, 2]);
    t = tf.slice(t, [0, 0, 0, 0], [1, 3, height, width]);
    t = tf.div(t, 255.0);
    return t;
}

ort.env.wasm.numThreads = 4; ort.env.wasm.simd = true; ort.env.wasm.proxy = true;

async function predictImage(event, tilePad) {
    const imageData = Float32Array.from(event.data);
    const tensor = new ort.Tensor('float32', imageData, [1, 3, event.height, event.width]);
    const results = await model.run({ inputs: tensor });
    const image = {
        data: results.outputs.data,
        height: event.height,
        width: event.width,
    }
    let t = tf.tensor(Array.from(image.data));
    t = tf.reshape(t, [3, image.height * 4, image.width * 4]);
    t = tf.slice(t, [0, tilePad * 4, tilePad * 4], [3, image.height * 4 - tilePad * 8, image.width * 4 - tilePad * 8]);
    t = tf.mul(t, 255);
    t = tf.transpose(t, [1, 2, 0]);
    t = Array.from(t.dataSync());
    let arr = [];
    for (let i = 0; i < t.length; i ++) {
        arr.push(t[i]);
        if (((i + 1) % 3) === 0) {
            arr.push(255);
        }
    }
    arr = new Uint8ClampedArray(arr);
    return new ImageData(arr, image.width * 4 - tilePad * 8, image.height * 4 - tilePad * 8);
}

convert.onclick = async () => {
    if (!imageStage || processing) return;
    processing = true;
    const tilePad = Number.parseInt(document.getElementById("pad").value);
    const tileSize = Number.parseInt(document.getElementById("tile").value);
    switch (document.getElementById("model").value) {
        case "General":
            model = await ort.InferenceSession.create("../../js/tools/res/RealESRGAN_x4plus_int8.onnx");
            break;
        case "Animation":
            model = await ort.InferenceSession.create("../../js/tools/res/RealESRGAN_x4plus_anime_6B_int8.onnx");
            break;
        default:
            return;
    }

    output.width = imageWidth * 4;
    output.height = imageHeight * 4;
    const ctx = output.getContext("2d");
    ctx.clearRect(0, 0, output.width, output.height);

    let outImage = composeImage(imageData.data, imageWidth, imageHeight);
    outImage = tf.pad(outImage, [[0, 0], [0, 0], [tilePad, tilePad], [tilePad, tilePad]]);

    const countWidth = Math.ceil(imageWidth / tileSize);
    const countHeight = Math.ceil(imageHeight / tileSize);

    let count = 0;
    let total = countWidth * countHeight;

    for (let i = 0; i < countHeight; i++) {
        for (let j = 0; j < countWidth; j++) {
            const partX = Math.min(imageWidth, j * tileSize), partY = Math.min(imageHeight, i * tileSize);
            let partWidth = tileSize + tilePad * 2, partHeight = tileSize + tilePad * 2;
            if (partWidth + partX > outImage.shape[3])
                partWidth -= partWidth + partX - outImage.shape[3];
            if (partHeight + partY > outImage.shape[2])
                partHeight -= partHeight + partY - outImage.shape[2];
            const partImage = tf.slice(outImage, [0, 0, partY, partX], [1, 3, partHeight, partWidth]);
            const partOutImage = await predictImage({ data: Array.from(partImage.dataSync()), width: partWidth, height: partHeight }, tilePad);
            ctx.putImageData(partOutImage, partX * 4, partY * 4);
            count++;
        }
    }
}

const getImageData = (file) => {
    return {
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type,
        date: file.lastModifiedDate.toLocaleDateString(),
        size: file.size,
    }
}

const formatSize = (size) => size < 1024 ? size + "B" : size >= 1024 && size < Math.pow(1024, 2) ? parseFloat(size / 1024).toFixed(2) + "KB" : size >= Math.pow(1024, 2) && size < Math.pow(1024, 3) ? parseFloat(size / Math.pow(1024, 2)).toFixed(2) + "MB" : size > Math.pow(1024, 3) ? parseFloat(size / Math.pow(1024, 3)).toFixed(2) + "GB" : 0 + "B";

const setupDOM = (data) => {
    let imageRef = new Image();
    imageRef.src = inputImg.src = data.url;
    imageRef.onload = () => { // 正确
        imageStage = true;
        imageWidth = imageRef.width; imageHeight = imageRef.height;
        inputFR.innerHTML = "File Resolution: " + imageWidth + "x" + imageHeight;
        output.style.height = output.clientWidth * imageHeight / imageWidth + "px";
        const ctx = Object.assign(document.createElement("canvas"), { width: imageWidth, height: imageHeight }).getContext("2d");
        ctx.drawImage(imageRef, 0, 0);
        imageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
        console.log("image : " + imageWidth + " x " + imageHeight + '\n' + "canvas: " + output.clientWidth + " x " + output.clientHeight, imageData);
    }
    inputFN.innerHTML = "File name: " + data.name;
    inputFT.innerHTML = "File type: " + data.type;
    inputFU.innerHTML = "File update: " + data.date;
    inputFS.innerHTML = "File size: " + formatSize(data.size);
    drop.style.display = "none";
    preview.style.display = "flex";
}

drop.ondragover = (event) => {
    event.stopPropagation(); //拦截
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
}

drop.ondrop = (event) => {
    event.stopPropagation();
    event.preventDefault();
    setupDOM(getImageData(event.dataTransfer.files[0]));
}

inputFile.onchange = (event) => setupDOM(getImageData(event.target.files[0]));
