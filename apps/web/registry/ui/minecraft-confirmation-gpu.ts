// Original post/box_blur.fsh arithmetic and post_effect/blur.json pass order.
export const createConfirmationPainter = function createConfirmationPainter(
  canvas: HTMLCanvasElement
) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
  });

  if (!gl) {
    return null;
  }

  const shader = (kind: number, source: string) => {
    const value = gl.createShader(kind)!;
    gl.shaderSource(value, source);
    gl.compileShader(value);

    if (gl.getShaderParameter(value, gl.COMPILE_STATUS) !== true) {
      throw new Error(
        gl.getShaderInfoLog(value) ?? "Confirmation shader failed"
      );
    }

    return value;
  };

  const shaders: WebGLShader[] = [];

  const make = (fragment: string) => {
    const vertex = shader(
      gl.VERTEX_SHADER,
      "attribute vec2 position;varying vec2 texCoord;void main(){gl_Position=vec4(position*2.-1.,0.,1.);texCoord=position;}"
    );

    const pixel = shader(
      gl.FRAGMENT_SHADER,
      `precision highp float;varying vec2 texCoord;uniform highp sampler2D image;uniform vec2 step;uniform float radius;${
        fragment
      }`
    );

    shaders.push(vertex, pixel);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, pixel);
    gl.linkProgram(program);

    if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
      throw new Error(
        gl.getProgramInfoLog(program) ?? "Confirmation program failed"
      );
    }

    return program;
  };

  const blur = make(
    "void main(){vec4 sum=vec4(0.);for(int i=0;i<10;i++){float a=-radius+.5+2.*float(i);if(a>radius)break;sum+=texture2D(image,texCoord+step*a);}sum+=texture2D(image,texCoord+step*radius)/2.;gl_FragColor=sum/(radius+.5);}"
  );

  const copy = make("void main(){gl_FragColor=texture2D(image,texCoord);}");
  const shade = make("void main(){gl_FragColor=vec4(0.,0.,0.,64./255.);}");

  const buffer = gl.createBuffer();
  const framebuffer = gl.createFramebuffer();
  const textures = [gl.createTexture(), gl.createTexture()];

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // The original screenquad vertex shader uses one oversized triangle.
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 2, 0, 0, 2]),
    gl.STATIC_DRAW
  );
  gl.disable(gl.DITHER);

  for (const texture of textures) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  const activateProgram = (program: WebGLProgram) => {
    gl.useProgram(program);
    const location = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  };

  return {
    dispose() {
      for (const program of [blur, copy, shade]) {
        gl.deleteProgram(program);
      }

      for (const shaderHandle of shaders) {
        gl.deleteShader(shaderHandle);
      }

      for (const texture of textures) {
        gl.deleteTexture(texture);
      }

      gl.deleteFramebuffer(framebuffer);
      gl.deleteBuffer(buffer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
    paint(source: HTMLCanvasElement, radius: number) {
      canvas.width = source.width;
      canvas.height = source.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.BLEND);

      for (const texture of textures) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          canvas.width,
          canvas.height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null
        );
      }

      gl.bindTexture(gl.TEXTURE_2D, textures[0]);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source
      );
      activateProgram(blur);
      gl.uniform1f(gl.getUniformLocation(blur, "radius"), radius);

      for (let pass = 0; pass < 6; pass += 1) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          textures[(pass + 1) % 2],
          0
        );
        gl.bindTexture(gl.TEXTURE_2D, textures[pass % 2]);
        gl.uniform2f(
          gl.getUniformLocation(blur, "step"),
          pass % 2 ? 0 : 1 / canvas.width,
          pass % 2 ? 1 / canvas.height : 0
        );
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      activateProgram(copy);
      gl.bindTexture(gl.TEXTURE_2D, textures[0]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      activateProgram(shade);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(
        gl.SRC_ALPHA,
        gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA
      );
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
};
