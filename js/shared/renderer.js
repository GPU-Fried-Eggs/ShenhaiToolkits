class WebGlStrategy {
    constructor(gl) {
        this.gl = gl;
    }
    texImage2DHalfFloatRGBA(width, height) {}
    getExtension(extension) {
        let ext = this.gl.getExtension(extension);
        if(!ext) console.log(extension + "extension is not supported");
        return ext;
    }
}

class WebGl1Strategy extends WebGlStrategy {
    constructor(gl) {
        super(gl);
        this.ext = this.getExtension("OES_texture_half_float");
        this.getExtension("OES_texture_half_float_linear");
    }
    texImage2DHalfFloatRGBA(width, height) {
        const gl = this.gl;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, this.ext.HALF_FLOAT_OES, null);
    }
}

class WebGl2Strategy extends WebGlStrategy {
    constructor(gl) {
        super(gl);
        this.getExtension("EXT_color_buffer_float");
        this.getExtension("OES_texture_float_linear");
    }
    texImage2DHalfFloatRGBA(width, height) {
        const gl = this.gl;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    }
}

class GlHandle {
    constructor(canvas, contextAttrs) {
        this.canvas = canvas;
        let gl =  (canvas.getContext("webgl2", contextAttrs));
        if (gl) {
            this.strategy = new WebGl2Strategy(gl);
        } else {
            gl =  (canvas.getContext("webgl", contextAttrs));
            if (gl) {
                this.strategy = new WebGl1Strategy(gl);
            }
        }
        this.gl = gl;
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0]), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        this.quad = positionBuffer;
        this.buffers = {};
        this.textureCount = 0;
    }
    getLineNumberedSource(source) {
        const lines = source.split(/\r?\n/);
        const maxDigits = lines.length.toString().length;
        const padLineNumber = (str, targetLength) => (str.length >= targetLength) ? str : " ".repeat(targetLength - str.length) + str;
        var buffer = [];
        lines.forEach((line, index) => {
            const lineNumber = padLineNumber((index + 1).toString(), maxDigits);
            buffer.push(lineNumber + ": " + line + "\n");
        });
        return buffer.join("");
    }
    loadShader(id, type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            console.error("Cannot compile shader - " + id + ": " + String(gl.getShaderInfoLog(shader)));
            console.error(this.getLineNumberedSource(source));
        }
        return shader;
    }
    initProgram(id, vertexShaderSource, fragmentShaderSource) {
        const gl = this.gl;
        const vertexShader = this.loadShader(id, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.loadShader(id, gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        return program;
    }
    newDoubleBuffer(textureInitializer) {
        return new DoubleBuffer(this.gl, this.strategy, () => {
            textureInitializer(this.gl)
        });
    }
    wrapProgram(id, program, vertexAttribute, buffer) {
        const gl = this.gl;
        const uniformSpecs = [];
        const activeUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < activeUniforms; i++) {
            const uniform = gl.getActiveUniform(program, i);
            uniformSpecs.push({
                name: uniform.name,
                location: gl.getUniformLocation(program, uniform.name)
            });
        }
        return {
            vertexAttributeLocation: gl.getAttribLocation(program, vertexAttribute),
            uniformSpecs: uniformSpecs,
            init: buffer ? (width, height) => buffer.init(width, height) : () => {},
            draw: (uniforms, drawer) => {
                gl.useProgram(program);
                uniforms();
                if (buffer) {
                    buffer.swapTextures();
                    buffer.draw(drawer);
                } else {
                    drawer();
                }
            }
        };
    }
    updateViewportSize() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    texImage2DHalfFloatRGBA(width, height) {
        this.strategy.texImage2DHalfFloatRGBA(width, height);
    }
    bindTexture(location, texture) {
        const gl = this.gl;
        const tex = texture instanceof DoubleBuffer ? texture.out : texture;
        gl.activeTexture(gl.TEXTURE0 + this.textureCount);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(location, this.textureCount++);
    }
    unbindTextures() {
        const gl = this.gl;
        for (let i = 0; i < this.textureCount; i++) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        this.textureCount = 0;
    }
    drawQuad(vertexAttributeLocation) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
        gl.enableVertexAttribArray(vertexAttributeLocation);
        gl.vertexAttribPointer(vertexAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disableVertexAttribArray(vertexAttributeLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}

class DoubleBuffer {
    constructor(gl, strategy, textureInitializer) {
        this.fbo = gl.createFramebuffer();
        this.gl = gl;
        this.strategy = strategy;
        this.textureInitializer = textureInitializer;
        this.in = null;
        this.out = null;
    }
    init(width, height) {
        this.deleteTextures();
        this.in = this.createTexture(width, height);
        this.out = this.createTexture(width, height);
    }
    createTexture(width, height) {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        this.textureInitializer(gl);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }
    draw(drawer) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.out, 0);
        drawer();
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    swapTextures() {
        const tmp = this.out;
        this.out = this.in;
        this.in = tmp;
    }
    deleteTextures() {
        if (this.in) this.gl.deleteTexture(this.in);
        if (this.out) this.gl.deleteTexture(this.out);
    }
    release() {
        const gl = this.gl;
        this.deleteTextures();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(this.fbo)
    }
}

class Renderer {
    constructor(glWrapper, context, program, uniforms) {
        this.program = program;
        const gl = glWrapper.gl;
        this.fillUniforms = () => {
            for (const uniform of uniforms) {
                uniform.setter(gl, uniform.location, context);
            }
        }
        this.draw = () => {
            glWrapper.drawQuad(program.vertexAttributeLocation);
            glWrapper.unbindTextures();
        }
    }
    render() {
        this.program.draw(this.fillUniforms, this.draw);
    }
}

function shade(config) {
    const
        canvas = config.canvas, shaders = config.shaders,
        onInit = config.onInit, onResize = config.onResize,
        onBeforeFrame = config.onBeforeFrame, onAfterFrame = config.onAfterFrame;
    try {
        const contextAttrs = { antialias: false, depth: false, alpha: false };
        const glHandle = new GlHandle(canvas, contextAttrs);
        const initProgram = (id, vertexShaderSource, fragmentShaderSource) => {
            try {
                return glHandle.initProgram(id, vertexShaderSource, fragmentShaderSource);
            } catch (error) {
                console.error(error.message);
            }
        }
        const renderers = [];
        const context = {
            gl: glHandle.gl,
            canvas: canvas,
            width: 0,
            height: 0,
            cssPixelRatio: 0,
            cssWidth: 0,
            cssHeight: 0,
            isOverShader: (x, y) => {
                const rect = canvas.getBoundingClientRect();
                return (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
            },
            toShaderX: x => (x - canvas.getBoundingClientRect().left) * context.cssPixelRatio + 0.5,
            toShaderY: y => (canvas.height - (y - canvas.getBoundingClientRect().top) * context.cssPixelRatio) - 0.5,
            maybeResize: () => {
                if ((context.cssWidth !== canvas.clientWidth) || (context.cssHeight !== canvas.clientHeight)) {
                    context.resize();
                    return true;
                }
                return false;
            },
            resize: () => {
                const
                    pixelRatio = window.devicePixelRatio || 1,
                    cssWidth   = canvas.clientWidth,
                    cssHeight  = canvas.clientHeight,
                    width      = Math.floor(cssWidth  * pixelRatio),
                    height     = Math.floor(cssHeight * pixelRatio);
                canvas.width  = width;
                canvas.height = height;
                context.width         = width;
                context.height        = height;
                context.cssPixelRatio = pixelRatio;
                context.cssWidth      = cssWidth;
                context.cssHeight     = cssHeight;
                glHandle.updateViewportSize();
                for (const renderer of renderers) {
                    renderer.program.init(width, height);
                }
            },
            texture: (loc, tex) => glHandle.bindTexture(loc, tex),
            buffers: {},
            initHalfFloatRGBATexture: (width, height) => {
                glHandle.texImage2DHalfFloatRGBA(width, height);
            }
        }
        const imageShaderIndex = Object.keys(shaders).length - 1;
        const defaultTextureInitializer = (gl, ctx) => {
            ctx.initHalfFloatRGBATexture(ctx.width, ctx.height);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        };
        let index = 0;
        const getFragmentShaderSource = (id) => {
            const fragmentShaderId = id + "-fs";
            const element = document.getElementById(fragmentShaderId);
            if (element) {
                return element.text;
            }
            return "precision highp float;void main(){gl_FragColor=vec4(1, 0, 0, 1);}";
        }

        const getVertexShaderSource = (id) => {
            const vertexShaderId = id + "-vs";
            const element = document.getElementById(vertexShaderId);
            if (element) {
                return element.text;
            }
            return "attribute vec2 V;void main(){gl_Position=vec4(V,0,1);}";
        }
        for (const shader in shaders) {
            if (index++ < imageShaderIndex) {
                const textureInitializer = shaders[shader].texture || defaultTextureInitializer;
                context.buffers[shader] = glHandle.newDoubleBuffer(() => {
                    textureInitializer(glHandle.gl, context);
                });
            }
            const program = glHandle.wrapProgram(shader, initProgram(shader, getVertexShaderSource(shader), getFragmentShaderSource(shader)), "V", context.buffers[shader]);
            const uniformSetters = (shaders[shader].uniforms) ||  ({});
            var extraUniforms = Object.keys(uniformSetters);
            for (const spec of program.uniformSpecs) {
                if(!uniformSetters[spec.name]) {
                    console.error("No configuration for uniform \"" + spec.name + "\" defined in shader \"" + shader + "\"");
                }
                extraUniforms = extraUniforms.filter(name => name !== spec.name);
            }
            if (extraUniforms.length !== 0) {
                console.warn("Extra uniforms configured for shader \"" + shader + "\", which are not present in the shader code " + "- might have been removed by GLSL compiler if not used: " + extraUniforms.join(", "));
            }
            const uniforms = program.uniformSpecs.map(spec => ({ location: spec.location, setter: uniformSetters[spec.name] }));
            renderers.push(new Renderer(glHandle, context, program, uniforms));
        }
        const animate = () => {
            if (context.maybeResize() && onResize) {
                onResize(context.width, context.height, context);
            }
            if (onBeforeFrame) {
                onBeforeFrame(context);
            }
            for (const renderer of renderers) {
                renderer.render();
            }
            if (onAfterFrame) {
                onAfterFrame(context);
            }
            requestAnimationFrame(animate);
        }
        const start = () => {
            context.resize();
            if (onInit) {
                onInit(context);
            }
            if (onResize) {
                onResize(context.width, context.height, context);
            }
            requestAnimationFrame(animate);
        }
        if(document.readyState === "loading"){
            document.addEventListener("load", start);
        } else {
            start();
        }
        return context;
    } catch (error) {
        console.error(error.message);
    }
}