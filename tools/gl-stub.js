/**
 * ICE DRIFT tests — WebGL 1.0 / 2D canvas stubs with REAL GL enum values.
 * Enough for three.js r147 to construct a WebGLRenderer and run its whole
 * render path (buffers, textures, programs, state, shadow maps, PMREM).
 * Rendering output is not verified — logic, scene graph and errors are.
 */
'use strict';

const ENUMS = {
  DEPTH_BUFFER_BIT: 256, STENCIL_BUFFER_BIT: 1024, COLOR_BUFFER_BIT: 16384,
  POINTS: 0, LINES: 1, LINE_LOOP: 2, LINE_STRIP: 3, TRIANGLES: 4, TRIANGLE_STRIP: 5, TRIANGLE_FAN: 6,
  ZERO: 0, ONE: 1, SRC_COLOR: 768, ONE_MINUS_SRC_COLOR: 769, SRC_ALPHA: 770, ONE_MINUS_SRC_ALPHA: 771,
  DST_ALPHA: 772, ONE_MINUS_DST_ALPHA: 773, DST_COLOR: 774, ONE_MINUS_DST_COLOR: 775, SRC_ALPHA_SATURATE: 776,
  CONSTANT_COLOR: 32769, ONE_MINUS_CONSTANT_COLOR: 32770, CONSTANT_ALPHA: 32771, ONE_MINUS_CONSTANT_ALPHA: 32772,
  FUNC_ADD: 32774, FUNC_SUBTRACT: 32778, FUNC_REVERSE_SUBTRACT: 32779, MIN: 32775, MAX: 32776,
  BLEND_EQUATION: 32777, BLEND_EQUATION_RGB: 32777, BLEND_EQUATION_ALPHA: 34877,
  BLEND_DST_RGB: 32968, BLEND_SRC_RGB: 32969, BLEND_DST_ALPHA: 32970, BLEND_SRC_ALPHA: 32971, BLEND_COLOR: 32773,
  ARRAY_BUFFER: 34962, ELEMENT_ARRAY_BUFFER: 34963, ARRAY_BUFFER_BINDING: 34964, ELEMENT_ARRAY_BUFFER_BINDING: 34965,
  STREAM_DRAW: 35040, STATIC_DRAW: 35044, DYNAMIC_DRAW: 35048, BUFFER_SIZE: 34660, BUFFER_USAGE: 34661,
  CURRENT_VERTEX_ATTRIB: 34342,
  FRONT: 1028, BACK: 1029, FRONT_AND_BACK: 1032,
  TEXTURE_2D: 3553, TEXTURE_CUBE_MAP: 34067, TEXTURE_BINDING_2D: 32873, TEXTURE_BINDING_CUBE_MAP: 34068,
  CUBE_MAP_POSITIVE_X: 34069, CUBE_MAP_NEGATIVE_X: 34070, CUBE_MAP_POSITIVE_Y: 34071,
  CUBE_MAP_NEGATIVE_Y: 34072, CUBE_MAP_POSITIVE_Z: 34073, CUBE_MAP_NEGATIVE_Z: 34074,
  MAX_CUBE_MAP_TEXTURE_SIZE: 34076,
  TEXTURE0: 33984,
  ACTIVE_TEXTURE: 34016,
  REPEAT: 10497, CLAMP_TO_EDGE: 33071, MIRRORED_REPEAT: 33648,
  TEXTURE_MIN_FILTER: 10241, TEXTURE_MAG_FILTER: 10240, TEXTURE_WRAP_S: 10242, TEXTURE_WRAP_T: 10243,
  NEAREST: 9728, LINEAR: 9729, NEAREST_MIPMAP_NEAREST: 9984, LINEAR_MIPMAP_NEAREST: 9985,
  NEAREST_MIPMAP_LINEAR: 9986, LINEAR_MIPMAP_LINEAR: 9987,
  TEXTURE_LOD_BIAS: 34049,
  BYTE: 5120, UNSIGNED_BYTE: 5121, SHORT: 5122, UNSIGNED_SHORT: 5123, INT: 5124, UNSIGNED_INT: 5125, FLOAT: 5126,
  HALF_FLOAT: 5131, HALF_FLOAT_OES: 36193,
  DEPTH_COMPONENT: 6402, ALPHA: 6406, RGB: 6407, RGBA: 6408, LUMINANCE: 6409, LUMINANCE_ALPHA: 6410,
  RED: 6403, RG: 33319, RG_INTEGER: 33320, RGB_INTEGER: 36248, RGBA_INTEGER: 36249,
  RGB8: 32849, RGBA8: 32856, RGBA4: 32854, RGB5_A1: 32855, RGB565: 36194, RGB10_A2: 32857,
  SRGB_EXT: 35904, SRGB_ALPHA_EXT: 35905, SRGB8_ALPHA8: 35907, SLUMINANCE: 35910,
  RGBA16F: 34842, RGBA32F: 34836, RGB16F: 34843, R11F_G11F_B10F: 35898,
  UNSIGNED_SHORT_5_6_5: 33635, UNSIGNED_SHORT_4_4_4_4: 32819, UNSIGNED_SHORT_5_5_5_1: 32820,
  UNSIGNED_INT_2_10_10_10_REV: 33640, UNSIGNED_INT_24_8: 34042, UNSIGNED_INT_10F_11F_11F_REV: 35899,
  DEPTH_COMPONENT16: 33189, DEPTH_COMPONENT24: 33190, DEPTH_COMPONENT32F: 36012, DEPTH_STENCIL: 34041,
  DEPTH24_STENCIL8: 35056, DEPTH_STENCIL_ATTACHMENT: 33306,
  FRAMEBUFFER: 36160, RENDERBUFFER: 36161, FRAMEBUFFER_BINDING: 36006, RENDERBUFFER_BINDING: 36007,
  COLOR_ATTACHMENT0: 36064, DEPTH_ATTACHMENT: 36096, STENCIL_ATTACHMENT: 36128,
  FRAMEBUFFER_COMPLETE: 36053, FRAMEBUFFER_UNSUPPORTED: 36061,
  MAX_RENDERBUFFER_SIZE: 34024, MAX_SAMPLES: 36183, MAX_COLOR_ATTACHMENTS: 36063,
  INVALID_ENUM: 1280, INVALID_VALUE: 1281, INVALID_OPERATION: 1282, OUT_OF_MEMORY: 1285,
  INVALID_FRAMEBUFFER_OPERATION: 1286, NO_ERROR: 0, CONTEXT_LOST_WEBGL: 37442,
  VERSION: 7938, RENDERER: 7937, VENDOR: 7936,
  SHADING_LANGUAGE_VERSION: 35724,
  MAX_TEXTURE_SIZE: 3379, MAX_VIEWPORT_DIMS: 3386, MAX_VERTEX_ATTRIBS: 34921,
  MAX_TEXTURE_IMAGE_UNITS: 34930, MAX_VERTEX_TEXTURE_IMAGE_UNITS: 35660, MAX_COMBINED_TEXTURE_IMAGE_UNITS: 35661,
  MAX_VERTEX_UNIFORM_VECTORS: 36347, MAX_VARYING_VECTORS: 36348, MAX_FRAGMENT_UNIFORM_VECTORS: 36349,
  LOW_FLOAT: 36336, MEDIUM_FLOAT: 36337, HIGH_FLOAT: 36338, LOW_INT: 36339, MEDIUM_INT: 36340, HIGH_INT: 36341,
  VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632,
  DELETE_STATUS: 35712, COMPILE_STATUS: 35713, LINK_STATUS: 35714, VALIDATE_STATUS: 35715,
  INFO_LOG_LENGTH: 35716, ATTACHED_SHADERS: 35717, ACTIVE_UNIFORMS: 35718, ACTIVE_UNIFORM_MAX_LENGTH: 35719,
  SHADER_SOURCE_LENGTH: 35720, ACTIVE_ATTRIBUTES: 35721, ACTIVE_ATTRIBUTE_MAX_LENGTH: 35722,
  CURRENT_PROGRAM: 35725,
  NEVER: 512, LESS: 513, EQUAL: 514, LEQUAL: 515, GREATER: 516, NOTEQUAL: 517, GEQUAL: 518, ALWAYS: 519,
  DEPTH_TEST: 2929, DEPTH_WRITEMASK: 2930, DEPTH_CLEAR_VALUE: 2931, DEPTH_FUNC: 2932, DEPTH_RANGE: 2928,
  DEPTH_BITS: 3414, STENCIL_BITS: 3415,
  STENCIL_TEST: 2960, STENCIL_CLEAR_VALUE: 2961, STENCIL_FUNC: 2962, STENCIL_VALUE_MASK: 2963,
  STENCIL_FAIL: 2964, STENCIL_PASS_DEPTH_FAIL: 2965, STENCIL_PASS_DEPTH_PASS: 2966, STENCIL_REF: 2967,
  STENCIL_WRITEMASK: 2968, STENCIL_BACK_FUNC: 34816, STENCIL_BACK_FAIL: 34817,
  STENCIL_BACK_PASS_DEPTH_FAIL: 34818, STENCIL_BACK_PASS_DEPTH_PASS: 34819, STENCIL_BACK_REF: 36003,
  STENCIL_BACK_VALUE_MASK: 36004, STENCIL_BACK_WRITEMASK: 36005,
  VIEWPORT: 2978, SCISSOR_BOX: 3088, SCISSOR_TEST: 3089,
  COLOR_CLEAR_VALUE: 3106, COLOR_WRITEMASK: 3107,
  UNPACK_ALIGNMENT: 3317, PACK_ALIGNMENT: 3333,
  SUBPIXEL_BITS: 3408,
  RED_BITS: 3410, GREEN_BITS: 3411, BLUE_BITS: 3412, ALPHA_BITS: 3413,
  LINE_WIDTH: 2849,
  POLYGON_OFFSET_UNITS: 10752, POLYGON_OFFSET_FACTOR: 32824, POLYGON_OFFSET_FILL: 32823,
  SAMPLE_ALPHA_TO_COVERAGE: 32926, SAMPLE_COVERAGE: 32928, SAMPLE_BUFFERS: 32936, SAMPLES: 32937,
  SAMPLE_COVERAGE_VALUE: 32938, SAMPLE_COVERAGE_INVERT: 32939,
  CULL_FACE: 2884, CULL_FACE_MODE: 2885, FRONT_FACE: 2886, CW: 2304, CCW: 2305,
  BLEND: 3042, BLEND_SRC: 32969, BLEND_DST: 32968,
  UNPACK_FLIP_Y_WEBGL: 37440, UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441, UNPACK_COLORSPACE_CONVERSION_WEBGL: 37443,
  BROWSER_DEFAULT_WEBGL: 37444,
  TEXTURE_MAX_ANISOTROPY_EXT: 34046, MAX_TEXTURE_MAX_ANISOTROPY_EXT: 34047,
  COMPLETION_STATUS_KHR: 37297,
};

function makeGL(canvas) {
  const GL = Object.assign({}, ENUMS);
  let id = 1;
  const o = (extra) => Object.assign({ __id: id++ }, extra);
  GL.canvas = canvas;
  GL.drawingBufferWidth = canvas.width || 300;
  GL.drawingBufferHeight = canvas.height || 150;

  /* ---- object creation ---- */
  GL.createBuffer = () => o({ __k: 'buffer', data: null });
  GL.createTexture = () => o({ __k: 'tex' });
  GL.createFramebuffer = () => o({ __k: 'fb' });
  GL.createRenderbuffer = () => o({ __k: 'rb' });
  GL.createProgram = () => o({ __k: 'prog' });
  GL.createShader = (t) => o({ __k: 'sh', type: t });
  GL.createQuery = () => o({});
  GL.getExtension = (name) => {
    switch (name) {
      case 'ANGLE_instanced_arrays':
        return {
          VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE: 35070,
          vertexAttribDivisorANGLE: () => { },
          drawArraysInstancedANGLE: () => { },
          drawElementsInstancedANGLE: () => { },
        };
      case 'OES_vertex_array_object':
        return {
          createVertexArrayOES: () => o({ __k: 'vao' }),
          deleteVertexArrayOES: () => { },
          bindVertexArrayOES: () => { },
          isVertexArrayOES: () => false,
        };
      case 'EXT_texture_filter_anisotropic':
        return { TEXTURE_MAX_ANISOTROPY_EXT: 34046, MAX_TEXTURE_MAX_ANISOTROPY_EXT: 34047 };
      case 'WEBGL_lose_context':
        return { loseContext: () => { }, restoreContext: () => { } };
      case 'WEBGL_debug_renderer_info':
        return { UNMASKED_VENDOR_WEBGL: 37445, UNMASKED_RENDERER_WEBGL: 37446 };
      case 'EXT_shader_texture_lod':
      case 'EXT_frag_depth':
      case 'OES_element_index_uint':
      case 'WEBGL_depth_texture':
      case 'OES_standard_derivatives':
      case 'OES_texture_float':
      case 'OES_texture_float_linear':
      case 'EXT_blend_minmax':
      case 'EXT_float_blend':
      case 'ANGLE_instanced_arrays2':
      case 'KHR_parallel_shader_compile':
        return {};
      default:
        return null;
    }
  };
  GL.getSupportedExtensions = () => ['ANGLE_instanced_arrays', 'OES_vertex_array_object', 'EXT_texture_filter_anisotropic',
    'WEBGL_lose_context', 'OES_element_index_uint', 'WEBGL_depth_texture', 'EXT_frag_depth', 'OES_standard_derivatives',
    'OES_texture_float', 'OES_texture_float_linear', 'EXT_blend_minmax', 'KHR_parallel_shader_compile', 'WEBGL_debug_renderer_info'];

  /* ---- parameters ---- */
  GL.getParameter = (p) => {
    switch (p) {
      case ENUMS.VERSION: return 'WebGL 1.0 (ice-drift test stub)';
      case ENUMS.SHADING_LANGUAGE_VERSION: return 'WebGL GLSL ES 1.0 (stub)';
      case ENUMS.VENDOR: return 'IceDriftTest';
      case ENUMS.RENDERER: return 'StubGL/1.0';
      case ENUMS.MAX_TEXTURE_SIZE: return 8192;
      case ENUMS.MAX_CUBE_MAP_TEXTURE_SIZE: return 8192;
      case ENUMS.MAX_RENDERBUFFER_SIZE: return 8192;
      case ENUMS.MAX_VIEWPORT_DIMS: return new Int32Array([8192, 8192]);
      case ENUMS.MAX_VERTEX_ATTRIBS: return 16;
      case ENUMS.MAX_TEXTURE_IMAGE_UNITS: return 16;
      case ENUMS.MAX_VERTEX_TEXTURE_IMAGE_UNITS: return 16;
      case ENUMS.MAX_COMBINED_TEXTURE_IMAGE_UNITS: return 32;
      case ENUMS.MAX_VERTEX_UNIFORM_VECTORS: return 1024;
      case ENUMS.MAX_VARYING_VECTORS: return 30;
      case ENUMS.MAX_FRAGMENT_UNIFORM_VECTORS: return 1024;
      case ENUMS.MAX_COLOR_ATTACHMENTS: return 8;
      case ENUMS.MAX_TEXTURE_MAX_ANISOTROPY_EXT: return 8;
      case ENUMS.MAX_SAMPLES: return 4;
      case ENUMS.VIEWPORT: return new Int32Array([0, 0, GL.drawingBufferWidth, GL.drawingBufferHeight]);
      case ENUMS.SCISSOR_BOX: return new Int32Array([0, 0, GL.drawingBufferWidth, GL.drawingBufferHeight]);
      case ENUMS.COLOR_CLEAR_VALUE: return new Float32Array([0, 0, 0, 1]);
      case ENUMS.COLOR_WRITEMASK: return [true, true, true, true];
      case ENUMS.DEPTH_CLEAR_VALUE: return 1;
      case ENUMS.DEPTH_RANGE: return new Float32Array([0, 1]);
      case ENUMS.STENCIL_CLEAR_VALUE: return 0;
      case ENUMS.ACTIVE_TEXTURE: return 33984;
      case ENUMS.UNPACK_ALIGNMENT: return 4;
      case ENUMS.PACK_ALIGNMENT: return 4;
      case ENUMS.UNPACK_FLIP_Y_WEBGL: return false;
      case ENUMS.UNPACK_PREMULTIPLY_ALPHA_WEBGL: return false;
      case ENUMS.UNPACK_COLORSPACE_CONVERSION_WEBGL: return ENUMS.BROWSER_DEFAULT_WEBGL;
      case ENUMS.DEPTH_BITS: return 24;
      case ENUMS.STENCIL_BITS: return 0;
      case ENUMS.RED_BITS: case ENUMS.GREEN_BITS: case ENUMS.BLUE_BITS: case ENUMS.ALPHA_BITS: return 8;
      case ENUMS.SAMPLES: return 0;
      case ENUMS.SAMPLE_BUFFERS: return 0;
      case ENUMS.LINE_WIDTH: return 1;
      case ENUMS.SUBPIXEL_BITS: return 4;
      case ENUMS.DEPTH_FUNC: return ENUMS.LEQUAL;
      case ENUMS.CULL_FACE_MODE: return ENUMS.BACK;
      case ENUMS.FRONT_FACE: return ENUMS.CCW;
      case ENUMS.STENCIL_FUNC: return ENUMS.ALWAYS;
      case ENUMS.STENCIL_BACK_FUNC: return ENUMS.ALWAYS;
      case ENUMS.COMPLETION_STATUS_KHR: return true;
      case ENUMS.CURRENT_PROGRAM: case ENUMS.ARRAY_BUFFER_BINDING: case ENUMS.ELEMENT_ARRAY_BUFFER_BINDING:
      case ENUMS.TEXTURE_BINDING_2D: case ENUMS.FRAMEBUFFER_BINDING: case ENUMS.RENDERBUFFER_BINDING:
      case ENUMS.TEXTURE_BINDING_CUBE_MAP: case ENUMS.CURRENT_VERTEX_ATTRIB:
        return null;
      default: return 0;
    }
  };
  GL.getContextAttributes = () => ({ alpha: false, antialias: true, depth: true, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false });
  GL.isContextLost = () => false;
  GL.getError = () => 0;
  GL.getShaderPrecisionFormat = () => ({ rangeMin: 127, rangeMax: 127, precision: 23 });
  GL.getDrawingBufferWidth = () => GL.drawingBufferWidth;
  GL.getDrawingBufferHeight = () => GL.drawingBufferHeight;

  /* ---- programs / shaders ---- */
  GL.shaderSource = (s, src) => { s.src = src; };
  GL.getShaderSource = (s) => s.src || '';
  GL.compileShader = (s) => { s.compiled = true; };
  GL.getShaderParameter = (s, p) => (p === ENUMS.COMPILE_STATUS ? true : 0);
  GL.getShaderInfoLog = () => '';
  GL.getShaderSourceLength = () => 0;
  GL.attachShader = () => { };
  GL.detachShader = () => { };
  GL.bindAttribLocation = () => { };
  GL.linkProgram = (p) => { p.linked = true; };
  GL.getProgramParameter = (p, n) => {
    switch (n) {
      case ENUMS.LINK_STATUS: return true;
      case ENUMS.VALIDATE_STATUS: return true;
      case ENUMS.ACTIVE_UNIFORMS: return 0;
      case ENUMS.ACTIVE_ATTRIBUTES: return 0;
      case ENUMS.ATTACHED_SHADERS: return 2;
      case ENUMS.DELETE_STATUS: return false;
      default: return 0;
    }
  };
  GL.getProgramInfoLog = () => '';
  GL.getActiveUniform = () => null;
  GL.getActiveAttrib = () => null;
  GL.getUniformLocation = () => o({ __k: 'uloc' });
  GL.getAttribLocation = () => 0;
  GL.getFragDataLocation = () => 0;
  GL.useProgram = () => { };
  GL.validateProgram = () => { };
  GL.deleteProgram = () => { };
  GL.deleteShader = () => { };

  /* ---- buffers ---- */
  GL.bindBuffer = () => { };
  GL.bufferData = () => { };
  GL.bufferSubData = () => { };
  GL.deleteBuffer = () => { };

  /* ---- textures ---- */
  GL.activeTexture = () => { };
  GL.bindTexture = () => { };
  GL.texImage2D = () => { };
  GL.texSubImage2D = () => { };
  GL.texParameteri = () => { };
  GL.texParameterf = () => { };
  GL.generateMipmap = () => { };
  GL.pixelStorei = () => { };
  GL.deleteTexture = () => { };
  GL.compressedTexImage2D = () => { };
  GL.copyTexImage2D = () => { };
  GL.copyTexSubImage2D = () => { };

  /* ---- framebuffers ---- */
  GL.bindFramebuffer = () => { };
  GL.bindRenderbuffer = () => { };
  GL.renderbufferStorage = () => { };
  GL.framebufferTexture2D = () => { };
  GL.framebufferRenderbuffer = () => { };
  GL.checkFramebufferStatus = () => ENUMS.FRAMEBUFFER_COMPLETE;
  GL.deleteFramebuffer = () => { };
  GL.deleteRenderbuffer = () => { };
  GL.readPixels = () => { };

  /* ---- state ---- */
  GL.enable = () => { }; GL.disable = () => { };
  GL.clearColor = () => { }; GL.clearDepth = () => { }; GL.clearStencil = () => { };
  GL.clear = () => { };
  GL.colorMask = () => { }; GL.depthMask = () => { }; GL.stencilMask = () => { };
  GL.depthFunc = () => { }; GL.depthRange = () => { };
  GL.blendFunc = () => { }; GL.blendFuncSeparate = () => { }; GL.blendEquation = () => { }; GL.blendEquationSeparate = () => { };
  GL.blendColor = () => { };
  GL.cullFace = () => { }; GL.frontFace = () => { };
  GL.viewport = () => { }; GL.scissor = () => { };
  GL.hint = () => { };
  GL.polygonOffset = () => { };
  GL.lineWidth = () => { };
  GL.stencilFunc = () => { }; GL.stencilFuncSeparate = () => { };
  GL.stencilOp = () => { }; GL.stencilOpSeparate = () => { };

  /* ---- attributes / draw ---- */
  GL.enableVertexAttribArray = () => { };
  GL.disableVertexAttribArray = () => { };
  GL.vertexAttribPointer = () => { };
  GL.vertexAttrib1f = () => { }; GL.vertexAttrib2f = () => { }; GL.vertexAttrib3f = () => { }; GL.vertexAttrib4f = () => { };
  GL.drawArrays = () => { GL.__draws = (GL.__draws || 0) + 1; };
  GL.drawElements = () => { GL.__draws = (GL.__draws || 0) + 1; };
  GL.finish = () => { }; GL.flush = () => { };

  /* ---- uniforms ---- */
  const noop = () => { };
  ['uniform1f', 'uniform2f', 'uniform3f', 'uniform4f', 'uniform1i', 'uniform2i', 'uniform3i', 'uniform4i',
    'uniform1fv', 'uniform2fv', 'uniform3fv', 'uniform4fv', 'uniform1iv', 'uniform2iv', 'uniform3iv', 'uniform4iv',
    'uniformMatrix2fv', 'uniformMatrix3fv', 'uniformMatrix4fv'].forEach(k => GL[k] = noop);

  return GL;
}

/* ---------------- 2D canvas context stub ---------------- */
function make2D(canvas) {
  const grad = { addColorStop() { } };
  const ctx = {
    canvas,
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10,
    globalAlpha: 1, globalCompositeOperation: 'source-over', font: '10px sans-serif', textAlign: 'start',
    textBaseline: 'alphabetic', direction: 'ltr', shadowBlur: 0, shadowColor: 'rgba(0,0,0,0)', shadowOffsetX: 0,
    shadowOffsetY: 0, imageSmoothingEnabled: true, filter: 'none',
    save() { }, restore() { }, scale() { }, rotate() { }, translate() { }, transform() { }, setTransform() { }, resetTransform() { },
    clearRect() { }, fillRect() { }, strokeRect() { }, beginPath() { }, closePath() { }, moveTo() { }, lineTo() { },
    bezierCurveTo() { }, quadraticCurveTo() { }, arc() { }, arcTo() { }, ellipse() { }, rect() { }, roundRect() { },
    fill() { }, stroke() { }, clip() { },
    createLinearGradient: () => grad, createRadialGradient: () => grad, createConicGradient: () => grad,
    createPattern: () => ({}), measureText: (t) => ({ width: (t || '').length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    fillText() { }, strokeText() { },
    drawImage() { },
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    putImageData() { },
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    isPointInPath: () => false,
  };
  return ctx;
}

module.exports = { makeGL, make2D, ENUMS };
