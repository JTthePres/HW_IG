// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
    
    // transaltion matrix
    var trans = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        translationX, translationY, translationZ, 1
    ];
    
    // rotation arround x
    var rotX = [
        1, 0, 0, 0,
        0, Math.cos(rotationX), Math.sin(rotationX), 0,
        0, -Math.sin(rotationX), Math.cos(rotationX), 0,
        0, 0, 0, 1
    ];
    
    // rotation arround y
    var rotY = [
        Math.cos(rotationY), 0, -Math.sin(rotationY), 0,
        0, 1, 0, 0,
        Math.sin(rotationY), 0, Math.cos(rotationY), 0,
        0, 0, 0, 1
    ];
    
    // combine rotations
    var rotationMatrix = MatrixMult(rotX, rotY);

    // combine translation and rotation
    var modelViewMatrix = MatrixMult(trans, rotationMatrix);
    
    // Combine with the projection matrix
    var mvp = MatrixMult(projectionMatrix, modelViewMatrix);
    
    return mvp;
}

class MeshDrawer {
    	// The constructor is a good place for taking care of the necessary initializations.
    constructor() {

        this.vertexBuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();
        this.program = gl.createProgram();
        
        // Vertex shader
        var vertShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertShader, `
            attribute vec3 aPosition;
            attribute vec2 aTexCoord;
            varying vec2 vTexCoord;
            uniform mat4 uModelViewProjection;
            uniform bool uSwapYZ;
            
            void main() {
                vec3 pos = aPosition;
                if (uSwapYZ) {
                    pos = vec3(pos.x, pos.z, pos.y);
                }
                gl_Position = uModelViewProjection * vec4(pos, 1.0);
                // Assicuriamoci che le coordinate texture siano passate correttamente
                vTexCoord = vec2(aTexCoord.x, aTexCoord.y);
            }
        `);
        gl.compileShader(vertShader);
        
        // Fragment shader
        var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragShader, `
            precision highp float;
            varying vec2 vTexCoord;
            uniform sampler2D uTexture;
            uniform bool uShowTexture;
            
            void main() {
                if (uShowTexture) {
                    // Utilizzo delle coordinate texture, gestendo eventuali problemi di mapping
                    // Assicuriamoci che le coordinate siano nel range [0,1] se necessario
                    vec2 texCoord = fract(vTexCoord); // Prende la parte frazionaria per gestire valori fuori range
                    vec4 texColor = texture2D(uTexture, texCoord);
                    
                    // Assicuriamoci che il colore abbia l'alpha corretto
                    texColor.a = 1.0;
                    gl_FragColor = texColor;
                } else {
                    gl_FragColor = vec4(1.0, gl_FragCoord.z * gl_FragCoord.z, 0.0, 1.0);
                }
            }
        `);
        gl.compileShader(fragShader);
        
        
        gl.attachShader(this.program, vertShader);
        gl.attachShader(this.program, fragShader);
        gl.linkProgram(this.program);
        
        this.positionAttribute = gl.getAttribLocation(this.program, "aPosition");
        this.texCoordAttribute = gl.getAttribLocation(this.program, "aTexCoord");
        
        this.mvpUniform = gl.getUniformLocation(this.program, "uModelViewProjection");
        this.swapYZUniform = gl.getUniformLocation(this.program, "uSwapYZ");
        this.showTextureUniform = gl.getUniformLocation(this.program, "uShowTexture");
        this.textureUniform = gl.getUniformLocation(this.program, "uTexture");
        
       
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        
        this.swapYZ(false);
        this.showTexture(false);
    }
    // This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions
	// and an array of 2D texture coordinates.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.


    // when user load obj file
    setMesh(vertPos, texCoords) {

        // update buffer vertex positions 
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
        
        // buffer texture coordinates
        const texCoordsArray = new Float32Array(texCoords);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoordsArray, gl.STATIC_DRAW);
        
        //update triangle count
        this.numTriangles = vertPos.length / 3;
    }
    
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.

    // for when user press swapYZ button
    swapYZ(swap) {
        gl.useProgram(this.program);
        gl.uniform1i(this.swapYZUniform, swap);
    }
    

	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.

    // draw triangular mesh
    draw(trans) {
        // Use shader
        gl.useProgram(this.program);
        
        // set matrix transformation
        gl.uniformMatrix4fv(this.mvpUniform, false, trans);
        
        // buffer vertex
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(this.positionAttribute);
        gl.vertexAttribPointer(this.positionAttribute, 3, gl.FLOAT, false, 0, 0);
        
        // Bbuffer texture coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordAttribute);
        gl.vertexAttribPointer(this.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);
        
        // Binding  texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.textureUniform, 0);
        
        // enable depth test
        gl.enable(gl.DEPTH_TEST);
        
        // draw triangles
        gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
    }
    
    	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
    setTexture(img) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        
        // load image
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        
        // set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        
        // generate mimpam 
        gl.generateMipmap(gl.TEXTURE_2D);
        
        // show texture
        gl.useProgram(this.program);
        gl.uniform1i(this.textureUniform, 0);
    }
    
    	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
    
    // if pressed showtexture button
    showTexture(show) {
        gl.useProgram(this.program);
        gl.uniform1i(this.showTextureUniform, show);
    }
}