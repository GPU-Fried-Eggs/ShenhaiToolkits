let model = null

async function loadModel() {
    if (!model) {

        model = await ort.InferenceSession.create("js/tools/res/RealESRGAN_x4plus_int8.onnx");
    }
    return model
}

function composeImage(data, width, height) {
    let t = tf.tensor(Array.from(data))
    t = tf.reshape(t, [1, height, width, 4])
    t = tf.transpose(t, [0, 3, 1, 2])
    t = tf.slice(t, [0, 0, 0, 0], [1, 3, height, width])
    t = tf.div(t, 255.0)
    return t
}

ort.env.wasm.numThreads = 4
ort.env.wasm.simd = true
ort.env.wasm.proxy = true

async function predictImage(event, tilePad) {
    const imageData = Float32Array.from(event.data)
    const tensor = new ort.Tensor('float32', imageData, [1, 3, event.height, event.width])
    const feeds = { inputs: tensor }
    model = await loadModel()
    const results = await model.run(feeds)
    const image = {
        data: results.outputs.data,
        height: event.height,
        width: event.width,
    }
    let t = tf.tensor(Array.from(image.data))
    t = tf.reshape(t, [3, image.height * 4, image.width * 4])
    t = tf.slice(t, [0, tilePad * 4, tilePad * 4], [3, image.height * 4 - tilePad * 8, image.width * 4 - tilePad * 8])
    t = tf.mul(t, 255)
    console.log('t', t)
    t = tf.transpose(t, [1, 2, 0])
    t = Array.from(t.dataSync())

    let arr = []
    for (let i = 0; i < t.length; i ++) {
        arr.push(t[i])
        if (((i + 1) % 3) === 0) {
            arr.push(255)
        }
    }
    arr = new Uint8ClampedArray(arr)
    return new ImageData(arr, image.width * 4 - tilePad * 8, image.height * 4 - tilePad * 8);
}

document.querySelector('input#file').addEventListener('change', loadFile)

function createImage(event) {
    const image = document.createElement('img')
    image.style.display = 'none'
    image.src = URL.createObjectURL(event.target.files[0])
    document.querySelector('body').appendChild(image)
    return image
}

async function loadFile(event) {
    const image = createImage(event)
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    image.addEventListener('load', async () => {
        const tilePad = Number.parseInt(document.getElementById('pad').value)
        const tileSize = Number.parseInt(document.getElementById('tile').value)
        const width = image.width
        const height = image.height

        document.querySelector('#canvasInfo').textContent = `${width}x${height}`

        console.log(width, height)
        canvas.width = width
        canvas.height = height
        ctx.drawImage(image, 0, 0, width, height, 0, 0, width, height)
        const data = ctx.getImageData(0, 0, width, height)
        image.parentNode.removeChild(image)

        // 输出画布
        const outputCanvas = document.getElementById('outputCanvas')
        outputCanvas.width = width * 4
        outputCanvas.height = height * 4
        const ctxOutput = outputCanvas.getContext('2d')
        ctxOutput.clearRect(0, 0, outputCanvas.width, outputCanvas.height)

        let outImage = composeImage(data.data, width, height)
        outImage = tf.pad(outImage, [[0, 0], [0, 0], [tilePad, tilePad], [tilePad, tilePad]])

        const countWidth = Math.ceil(width / tileSize)
        const countHeight = Math.ceil(height / tileSize)

        let count = 0
        let total = countWidth * countHeight

        for (let i = 0; i < countHeight; i++) {
            for (let j = 0; j < countWidth; j++) {
                document.querySelector('#outputCanvasInfo').textContent = `Calculate: ${count + 1}/${total}, process: ${Math.round(count / total * 10000) / 100}%`
                const partX = Math.min(width, j * tileSize)
                const partY = Math.min(height, i * tileSize)
                let partWidth = tileSize + tilePad * 2
                let partHeight = tileSize + tilePad * 2
                if (partWidth + partX > outImage.shape[3]) {
                    partWidth -= partWidth + partX - outImage.shape[3]
                }
                if (partHeight + partY > outImage.shape[2]) {
                    partHeight -= partHeight + partY - outImage.shape[2]
                }
                const partImage = tf.slice(outImage, [0, 0, partY, partX], [1, 3, partHeight, partWidth]);
                console.log('slice pos', partY, partX, partHeight, partWidth);
                const partOutImage = await predictImage({
                    data: Array.from(partImage.dataSync()),
                    width: partWidth,
                    height: partHeight,
                }, tilePad)
                ctxOutput.putImageData(partOutImage, partX * 4, partY * 4)
                count++
                document.querySelector('#outputCanvasInfo').textContent = `Calculate: ${count}/${total}, process: ${Math.round(count / total * 10000) / 100}%`
            }
        }
    })
}
