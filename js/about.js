window.onload = function() {

    const background = document.getElementById("background");
    const loadImage = (src) => new Promise((resolve, reject) => {
        let img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load image from: " + src));
        img.src = src;
    });

    shade({
        canvas : background,
        shaders: {
            image : {
                uniforms: {
                    iResolution: (gl, loc, ctx) => gl.uniform2f(loc, ctx.width, ctx.height),
                    iTime:       (gl, loc, ctx) => gl.uniform1f(loc, performance.now() / 1000),
                    iChannel0:   (gl, loc, ctx) => ctx.texture(loc, ctx.iChannel0)
                }
            }
        },
        onInit: (ctx) => {
            loadImage("../img/about/noise.png").then(image => {
                const gl = ctx.gl;
                const texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.bindTexture(gl.TEXTURE_2D, null);
                ctx.iChannel0 = texture;
            });
        }
    });
}
