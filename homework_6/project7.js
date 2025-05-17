// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	let sin = Math.sin;
	let cos = Math.cos;

	let rx = rotationX;
 
	let ry = rotationY;
	let rot_XM = [1,0,0,0, 0,cos(rx),sin(rx),0, 0,-sin(rx),cos(rx),0, 0,0,0,1];
	let rot_YM = [cos(ry),0,-sin(ry),0, 0,1,0,0, sin(ry),0,cos(ry),0, 0,0,0,1];

	let rotation_matrix = MatrixMult(rot_YM, rot_XM);

	let translation_matrix = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

    return MatrixMult(translation_matrix, rotation_matrix);
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer {
    constructor() {
        this.canvas = document.getElementById("canvas");
        this.gl = this.canvas.getContext("webgl");

        // Vertex shader source code
        this.vertexShaderCode = `
            attribute vec3 coordinates;
            attribute vec3 normal;
            uniform mat4 modelViewMatrix;
            uniform mat4 transformationMatrix;
            uniform mat3 normalMatrix;
            attribute vec2 texCoord;
            varying vec2 vTexCoord;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            uniform bool uSwapYZ;

            void main() {
                if (uSwapYZ == false) {
                    gl_Position = transformationMatrix * vec4(coordinates, 1.0);
                    vNormal = normalize(normalMatrix * normal);
                } else {
                    vec3 newCoordinates = vec3(coordinates.x, coordinates.z, coordinates.y);
                    gl_Position = transformationMatrix * vec4(newCoordinates, 1.0);
                    vNormal = normalize(normalMatrix * vec3(normal.x, normal.z, normal.y));
                }

                vTexCoord = texCoord;
                vViewDir = normalize(-vec3(modelViewMatrix * vec4(coordinates, 1.0)));
            }
        `;

        // Fragment shader source code
        this.fragmentShaderCode = `
            precision mediump float;
            varying vec2 vTexCoord;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            uniform sampler2D uSampler;
            uniform bool uTexture;
            uniform vec3 uLightDir;
            uniform float uShininess;

            void main() {
                vec3 lightDir = normalize(uLightDir);
                vec3 normal = normalize(vNormal);
                vec3 viewDir = normalize(vViewDir);

                vec3 diffuseColor = vec3(1.0, 1.0, 1.0);
                vec3 specularColor = vec3(1.5, 1.5, 1.5);

                if (uTexture) {
                    diffuseColor = texture2D(uSampler, vTexCoord).rgb;
                }

                float ambient = 0.05;
                float diffuse = max(0.0, dot(normal, lightDir));
                float specular = 0.0;

                if (diffuse > 0.0) {
                    vec3 halfDir = normalize(lightDir + viewDir);
                    specular = pow(max(0.0, dot(normal, halfDir)), uShininess);
                }

                vec3 color = diffuseColor * (ambient + diffuse) + specularColor * specular;
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        // Create and compile vertex and fragment shaders
        this.vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(this.vertexShader, this.vertexShaderCode);
        this.gl.compileShader(this.vertexShader);

        this.fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(this.fragmentShader, this.fragmentShaderCode);
        this.gl.compileShader(this.fragmentShader);

        // Create buffers
        this.vertexBuffer = this.gl.createBuffer();
        this.textureBuffer = this.gl.createBuffer();
        this.normalBuffer = this.gl.createBuffer();

        // Create texture and program
        this.texture = this.gl.createTexture();
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, this.vertexShader);
        this.gl.attachShader(this.program, this.fragmentShader);
        this.gl.linkProgram(this.program);

        // Set initial light direction and shininess
        this.setLightDir(1.0, 1.0, 1.0);
        this.setShininess(100.0);

        this.numTriangles = 0;
    }

    setMesh(vertPos, texCoords, normals) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertPos), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(texCoords), this.gl.STATIC_DRAW);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);

        this.numTriangles = vertPos.length / 3;
    }

    swapYZ(swap) {
        this.gl.useProgram(this.program);
        const uSwapYZLocation = this.gl.getUniformLocation(this.program, "uSwapYZ");
        this.gl.uniform1i(uSwapYZLocation, swap);
    }

    draw(matrixMVP, matrixMV, matrixNormal) {
        this.gl.useProgram(this.program);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        const coord = this.gl.getAttribLocation(this.program, "coordinates");
        this.gl.vertexAttribPointer(coord, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(coord);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
        const normal = this.gl.getAttribLocation(this.program, "normal");
        this.gl.vertexAttribPointer(normal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(normal);

        const transformationMatrixLocation = this.gl.getUniformLocation(this.program, "transformationMatrix");
        this.gl.uniformMatrix4fv(transformationMatrixLocation, false, matrixMVP);

        const modelViewMatrixLocation = this.gl.getUniformLocation(this.program, "modelViewMatrix");
        this.gl.uniformMatrix4fv(modelViewMatrixLocation, false, matrixMV);

        const normalMatrixLocation = this.gl.getUniformLocation(this.program, "normalMatrix");
        this.gl.uniformMatrix3fv(normalMatrixLocation, false, matrixNormal);

        const lightDirLocation = this.gl.getUniformLocation(this.program, "uLightDir");
        this.gl.uniform3fv(lightDirLocation, this.lightDir);

        // Bind the texture buffer to the ARRAY_BUFFER target of the WebGL context
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer);
        // Get the location of the texCoord attribute in the vertex shader
        const texCoordAttribLocation = this.gl.getAttribLocation(this.program, "texCoord");
        this.gl.vertexAttribPointer(texCoordAttribLocation, 2, this.gl.FLOAT, false, 0, 0);
        // Enable the vertex attribute array for the texture coordinates
        this.gl.enableVertexAttribArray(texCoordAttribLocation);

        // Bind the texture to the TEXTURE_2D target of the WebGL context
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        // Get the location of the uSampler uniform variable in the fragment shader
        const uSamplerLocation = this.gl.getUniformLocation(this.program, "uSampler");
        // Set the value of the uSampler uniform variable to 0
        this.gl.uniform1i(uSamplerLocation, 0);

        // Draw the mesh
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.numTriangles);
    }

    // This method is called to set the texture of the mesh.
    // The argument is an HTML IMG element containing the texture data.
    setTexture(img) {
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, gl.REPEAT);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, img);
    }

    // This method is called when the user changes the state of the
    // "Show Texture" checkbox.
    // The argument is a boolean that indicates if the checkbox is checked.
    showTexture(show) {
        this.gl.useProgram(this.program);
        const uTextureLocation = this.gl.getUniformLocation(this.program, "uTexture");
        this.gl.uniform1i(uTextureLocation, show);
    }

    // This method is called to set the incoming light direction
    setLightDir(x, y, z) {
        this.lightDir = [-x, -y, z];
    }

    // This method is called to set the shininess of the material
    setShininess(shininess) {
        this.gl.useProgram(this.program);
        const shininessLocation = this.gl.getUniformLocation(this.program, "uShininess");
        this.gl.uniform1f(shininessLocation, shininess);
    }
}

// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep(dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution) {
    let g_force = gravity.copy();
    g_force.scale(particleMass);
    let forces = new Array(positions.length).fill(g_force);

    
    springs.forEach((s) => {
        let p0 = { pos: positions[s.p0].copy(), vel: velocities[s.p0].copy() };
        let p1 = { pos: positions[s.p1].copy(), vel: velocities[s.p1].copy() };

        let springForces = computeSpringForce(p0, p1, s, stiffness, damping);

        forces[s.p0] = forces[s.p0].add(springForces.p0Force);
        forces[s.p1] = forces[s.p1].add(springForces.p1Force);
    });

    
    velocities.forEach((v, i) => {
        let force = forces[i].copy();
        let acceleration = force.div(particleMass);
        acceleration.scale(dt);
        velocities[i] = v.add(acceleration);
    });

    
    positions.forEach((p, i) => {
        let v = velocities[i].copy();
        v.scale(dt);
        positions[i] = p.add(v);
    });

    
    positions.forEach((p, i) => {
        let rbce = restitution;
        let diff = {x: Math.abs(p.x) - 1, y: Math.abs(p.y) - 1, z: Math.abs(p.z) - 1}; 
        let rb = {x: rbce * diff.x, y: rbce * diff.y, z: rbce * diff.z};
        if (diff.x > 0) { let a = p.x > 0 ? -1 : 1; positions[i].x = (p.x + (a * diff.x) + (a * rb.x)); velocities[i].x *= -rbce; }
        if (diff.y > 0) { let a = p.y > 0 ? -1 : 1; positions[i].y = (p.y + (a * diff.y) + (a * rb.y)); velocities[i].y *= -rbce; }
        if (diff.z > 0) { let a = p.z > 0 ? -1 : 1; positions[i].z = (p.z + (a * diff.z) + (a * rb.z)); velocities[i].z *= -rbce; }
    });
}


function computeSpringForce(p0, p1, s, stiffness, damping) {

    let spring_length = p1.pos.sub(p0.pos);
    p0.d = spring_length.copy();
    p0.d.normalize();
    p1.d = p0.d.copy();
    p1.d.scale(-1.0);
    spring_length = spring_length.len();


    let spring_diff = spring_length - s.rest;
    let spring_force_scalar = stiffness * spring_diff;
    p0.force = p0.d.copy();
    p0.force.scale(spring_force_scalar);
    p1.force = p1.d.copy();
    p1.force.scale(spring_force_scalar);

    
    let prev_p0 = p0.pos.sub(p0.vel);
    let prev_p1 = p1.pos.sub(p1.vel);
    let prev_spring_length = prev_p0.sub(prev_p1);
    prev_spring_length = prev_spring_length.len();
    let spring_rate = spring_length - prev_spring_length;

    
    let spring_damp_scalar = damping * spring_rate;
    p0.dampingForce = p0.d.copy();
    p0.dampingForce.scale(spring_damp_scalar);
    p1.dampingForce = p1.d.copy();
    p1.dampingForce.scale(spring_damp_scalar);

    return {p0Force: p0.force.add(p0.dampingForce), p1Force: p1.force.add(p1.dampingForce)};
}
