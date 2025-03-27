// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The transformation first applies scale, then rotation, and finally translation.
// The given rotation value is in degrees.

// aux function for matrix product 
function multiplyMatrices(A, B) {
    let result = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
    ];

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 3; k++) {
                result[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return result;
}

function GetTransform( positionX, positionY, rotation, scale )
{
	const S = [[scale, 0, 0],
		[0, scale, 0], 
		[0, 0, 1]];

	rotation = rotation * Math.PI / 180;
	const R = [[Math.cos(rotation), -Math.sin(rotation), 0], 
		[Math.sin(rotation), Math.cos(rotation), 0], 
		[0, 0, 1]];
	
	const T = [[1, 0, positionX],
		[0, 1, positionY],
		[0, 0, 1]];
	
	const M = multiplyMatrices(T,multiplyMatrices(R,S));

    return [
        M[0][0], M[1][0], M[2][0],  
        M[0][1], M[1][1], M[2][1],  
        M[0][2], M[1][2], M[2][2]   
    ];
}

// Returns a 3x3 transformation matrix as an array of 9 values in column-major order.
// The arguments are transformation matrices in the same format.
// The returned transformation first applies trans1 and then trans2.
function ApplyTransform( trans1, trans2 )
{
    // reconstruct matrices for product 
    T1 = [[trans1[0], trans1[3], trans1[6]],
        [trans1[1], trans1[4], trans1[7]],
        [trans1[2], trans1[5], trans1[8]]];
    T2 = [[trans2[0], trans2[3], trans2[6]],
        [trans2[1], trans2[4], trans2[7]],
        [trans2[2], trans2[5], trans2[8]]];

    //product
    const M = multiplyMatrices(T2,T1);

    return [
        M[0][0], M[1][0], M[2][0],  
        M[0][1], M[1][1], M[2][1],  
        M[0][2], M[1][2], M[2][2]   
    ];}
