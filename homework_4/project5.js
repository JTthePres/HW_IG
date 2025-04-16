// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix(translationX, translationY, translationZ, rotationX, rotationY) {
    // translaztion matrix
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
    
    // Combine rotations
    var rotationMatrix = MatrixMult(rotX, rotY);
    //combine rotation +translation
    var modelViewMatrix = MatrixMult(trans, rotationMatrix);
    
    return modelViewMatrix;
}

class MeshDrawer {
    constructor() {
        // create buffers
        this.vertexBuffer = gl.createBuffer();
        this.texCoordBuffer = gl.createBuffer();
        this.normalBuffer = gl.createBuffer();
        
        // create  shader
        this.program = gl.createProgram();
        
        // Vertex shader 
        var vertShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertShader, `
            attribute vec3 aPosition;
            attribute vec2 aTexCoord;
            attribute vec3 aNormal;
            
            varying vec2 vTexCoord;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            
            uniform mat4 uModelViewProjection;
            uniform mat4 uModelView;
            uniform mat3 uNormalMatrix;
            uniform bool uSwapYZ;
            
            void main() {
                vec3 pos = aPosition;
                vec3 norm = aNormal;
                
                if (uSwapYZ) {
                    pos = vec3(pos.x, pos.z, pos.y);
                    norm = vec3(norm.x, norm.z, norm.y);
                }
                
                // Trasformazione della posizione in spazio clip
                gl_Position = uModelViewProjection * vec4(pos, 1.0);
                
                // Passaggio delle coordinate texture al fragment shader
                vTexCoord = aTexCoord;
                
                // Trasformazione della normale nello spazio camera
                vNormal = normalize(uNormalMatrix * norm);
                
                // Calcolo della posizione del vertice nello spazio camera per lighting
                vViewPosition = vec3(uModelView * vec4(pos, 1.0));
            }
        `);
        gl.compileShader(vertShader);
        
        // Fragment shader 
		var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragShader, `
            precision highp float;
            
            varying vec2 vTexCoord;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            
            uniform sampler2D uTexture;
            uniform bool uShowTexture;
            uniform vec3 uLightDir;
            uniform float uShininess;
            
            void main() {
                // Normalizzazione della normale interpolata
                vec3 normal = normalize(vNormal);
                
                // Direzione della luce (normalizzata)
                vec3 lightDir = normalize(uLightDir);
                
                // Direzione di vista (dal punto alla camera, che è all'origine nello spazio camera)
                vec3 viewDir = normalize(-vViewPosition);
                
                // Vettore half per il modello Blinn
                vec3 halfVector = normalize(lightDir + viewDir);
                
                // Riduciamo la componente ambientale per ombre più scure
                float ambientFactor = 0.1;
                
                // Calcolo componente diffusa (Legge di Lambert)
                float diffuseFactor = max(dot(normal, lightDir), 0.0);
                
                // Aumentiamo leggermente il contrasto nella componente diffusa
                diffuseFactor = pow(diffuseFactor, 1.1);
                
                // Calcolo componente speculare (Blinn)
                float specularFactor = 0.0;
                if (diffuseFactor > 0.0) {
                    // Aumentiamo l'intensità speculare
                    specularFactor = 1.2 * pow(max(dot(normal, halfVector), 0.0), uShininess);
                }
                
                // Proprietà del materiale
                vec3 diffuseColor;
                if (uShowTexture) {
                    diffuseColor = texture2D(uTexture, vTexCoord).rgb;
                } else {
                    diffuseColor = vec3(1.0, 1.0, 1.0); // Colore diffuso bianco
                }
                vec3 specularColor = vec3(1.0, 1.0, 1.0); // Colore speculare bianco
                vec3 ambientColor = diffuseColor * 0.6; // Ridotto per ombre più profonde
                
                // Calcolo del colore finale usando il modello di illuminazione Blinn
                vec3 finalColor = ambientFactor * ambientColor +
                                  diffuseFactor * diffuseColor +
                                  specularFactor * specularColor;
                
                // Assicuriamoci che il colore non sia sovraesposto
                finalColor = min(finalColor, vec3(1.0));
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `);
        gl.compileShader(fragShader);
        
        // OLD DEBUG CODE used to check shader compilation errors
        // if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
        //     console.error('Errore di compilazione del vertex shader:', gl.getShaderInfoLog(vertShader));
        // }
        // if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
        //     console.error('Errore di compilazione del fragment shader:', gl.getShaderInfoLog(fragShader));
        // }
        
        gl.attachShader(this.program, vertShader);
        gl.attachShader(this.program, fragShader);
        gl.linkProgram(this.program);
        
        //         // OLD DEBUG CODE used to check linking errors
        // if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        //     console.error('Errore di linking del programma shader:', gl.getProgramInfoLog(this.program));
        // }
        
        // getters
        this.positionAttribute = gl.getAttribLocation(this.program, "aPosition");
        this.texCoordAttribute = gl.getAttribLocation(this.program, "aTexCoord");
        this.normalAttribute = gl.getAttribLocation(this.program, "aNormal");
        
        this.mvpUniform = gl.getUniformLocation(this.program, "uModelViewProjection");
        this.mvUniform = gl.getUniformLocation(this.program, "uModelView");
        this.normalMatrixUniform = gl.getUniformLocation(this.program, "uNormalMatrix");
        this.swapYZUniform = gl.getUniformLocation(this.program, "uSwapYZ");
        this.showTextureUniform = gl.getUniformLocation(this.program, "uShowTexture");
        this.textureUniform = gl.getUniformLocation(this.program, "uTexture");
        this.lightDirUniform = gl.getUniformLocation(this.program, "uLightDir");
        this.shininessUniform = gl.getUniformLocation(this.program, "uShininess");
        
        // create+initialization textures
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        
        // set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        
        
        this.swapYZ(false);
        this.showTexture(false);
        this.setLightDir(0, 0, -1);
        this.setShininess(32.0);    
    }
    

    setMesh(vertPos, texCoords, normals) {

        // bufffer updates

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
        
        // update number triangles
        this.numTriangles = vertPos.length / 3;
    }
    
    swapYZ(swap) {
        gl.useProgram(this.program);
        gl.uniform1i(this.swapYZUniform, swap ? 1 : 0);
    }

    draw(matrixMVP, matrixMV, matrixNormal) {
// use program shader
        gl.useProgram(this.program);
        
        // set transformation  matrix 
        gl.uniformMatrix4fv(this.mvpUniform, false, matrixMVP);
        gl.uniformMatrix4fv(this.mvUniform, false, matrixMV);
        gl.uniformMatrix3fv(this.normalMatrixUniform, false, matrixNormal);
        
        //buffer vertex
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(this.positionAttribute);
        gl.vertexAttribPointer(this.positionAttribute, 3, gl.FLOAT, false, 0, 0);
       
        // Bbuffer texture coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordAttribute);
        gl.vertexAttribPointer(this.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.enableVertexAttribArray(this.normalAttribute);
        gl.vertexAttribPointer(this.normalAttribute, 3, gl.FLOAT, false, 0, 0);
        
        // Binding  texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.textureUniform, 0);
        
        // enable depth test
        gl.enable(gl.DEPTH_TEST);
        
        // draw triangles
        gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
    }
    
    setTexture(img) {
        // Binding della texture
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        
        // set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        
        // load image
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        
        // generate mimpam 
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    
    showTexture(show) {
        // show texture
        gl.useProgram(this.program);
        gl.uniform1i(this.showTextureUniform, show ? 1 : 0);
    }
    
// set light direction
    setLightDir(x, y, z) {
        gl.useProgram(this.program);
        gl.uniform3f(this.lightDirUniform, x, y, z);
    }
    
    // set up shininess
    setShininess(shininess) {
        gl.useProgram(this.program);
        gl.uniform1f(this.shininessUniform, shininess);
    }
}