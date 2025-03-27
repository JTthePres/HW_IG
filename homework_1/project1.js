// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.

function composite(bgImg, fgImg, fgOpac, fgPos) {
    for (let y = 0; y < fgImg.height; y++) {
        for(let x = 0; x<fgImg.width;x++){
            let bx = x + fgPos.x;
            let by = y + fgPos.y;
            if(bx >=0 && by >=0 && by <= bgImg.height && bx <= bgImg.width){
                let index_f = (y*fgImg.width + x )*4;
                let index_b = (by*bgImg.width + bx )*4;

                let red_f = fgImg.data[index_f];
                let green_f = fgImg.data[index_f + 1];
                let blue_f = fgImg.data[index_f + 2];
                let alpha_f = fgImg.data[index_f + 3]/255 * fgOpac;

                let red_b = bgImg.data[index_b];
                let green_b = bgImg.data[index_b + 1];
                let blue_b = bgImg.data[index_b + 2];
                let alpha_b = bgImg.data[index_b + 3]/255;

                let alpha = alpha_f + (1-alpha_f)*alpha_b;
                bgImg.data[index_b] = (red_f*alpha_f + red_b*(1-alpha_f)*alpha_b)/alpha;
                bgImg.data[index_b + 1] = (green_f*alpha_f + green_b*(1-alpha_f)*alpha_b)/alpha;
                bgImg.data[index_b + 2] = (blue_f*alpha_f + blue_b*(1-alpha_f)*alpha_b)/alpha;
                bgImg.data[index_b + 3] = alpha*255;
            }
        }
    } 
}
