const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const image = new Image();
const MAX_SCALE = 5;
const SCALE_STEP = 0.05;
let canvasScale = 1, canvasScaleIndex = 0;

var text_pos_x = document.getElementById('pos_x');
var text_pos_z = document.getElementById('pos_z');
var text_description = document.getElementById('description');


// マウス関連
let mouseX, mouseY, press = false;
let mouseMoveX, mouseMoveY, mouseDragX, mouseDragY;

// 拡大・縮小後の画像表示領域
let zoomWidth = canvas.width / canvasScale, zoomHeight = canvas.height / canvasScale, zoomLeft = 0, zoomTop = 0;
let zoomLeftBuf = 0, zoomTopBuf = 0;

// 対象の座標
let objX = 200, objY = 200, objSize = 10;

const MAP_SIZE_X = 1000, MAP_SIZE_Y = 1000;
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

/**
 * オブジェクトのベースとなるクラス
 */
class BaseObject {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  
    // 初期表示
    draw(ctx) {}
    // 自オブジェクトがクリックされたかどうか判定
    testHit(point) {}
    // クリックされたときの処理
    clicked(ctx) {}
}
  
/**
* 矩形オブジェクトのクラス
*/
class Box extends BaseObject {
    constructor(x, y, size, description) {
        super(x, y);
        this.w = size;
        this.h = size;
        this.description = description;
        this.hitted = false;
    }
  
    draw(ctx) {
        ctx.save();
        if(this.hitted){
            ctx.strokeStyle = "red";
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x-zoomLeft+centerX-3, this.y-zoomTop+centerY-3, this.w+6, this.h+6)
        }
        
        ctx.fillStyle = "red";
        ctx.fillRect(this.x-zoomLeft+centerX, this.y-zoomTop+centerY, this.w, this.h); 
        ctx.restore();
    }
  
    
    clicked(ctx) {
    }
  
    hit(px, py) {
        this.hitted = (this.x <= px && px <= this.x + this.w) && (this.y <= py && py <= this.y + this.h);
    }
} 

canvas.addEventListener('mousewheel', canvasZoom);
canvas.addEventListener('mouseover', disableScroll);
canvas.addEventListener('mouseout', enableScroll);

// ドラッグ操作用
canvas.addEventListener('mousedown', function(){
    // マウスが押下された瞬間の情報を記録
    zoomLeftBuf = zoomLeft;
    zoomTopBuf = zoomTop;
    press = true;
});
canvas.addEventListener('mouseup', function(){press = false;});
canvas.addEventListener('mouseout', function(){press = false;});
canvas.addEventListener('mousemove', mouseMove);

const items = [];

function init(){
    // CSVファイルを取得
    let csv = new XMLHttpRequest();
    
    // CSVファイルへのパス
    csv.open("GET", "locations.csv", false);

    // csvファイル読み込み失敗時のエラー対応
    try {
        csv.send(null);
    } catch (err) {
        console.log(err);
    }

    // 改行ごとに配列化
    let lines = csv.responseText.split(/\r\n|\n/);

 
    // 1行ごとに処理
    for (let i = 0; i < lines.length; ++i) {
        let cells = lines[i].split(",");
        console.log(cells[2]);
        items.push(new Box(Number(cells[0]), Number(cells[1]), objSize, cells[2]));
    }
}



function draw() {
    ctx.fillStyle = 'green';
    ctx.fillRect(0, 0, canvas.width, canvas.height); 

    ctx.save();
    ctx.fillStyle = 'red';
    ctx.scale(canvasScale, canvasScale);

    ctx.strokeStyle = "silver";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(i = -MAP_SIZE_X; i<MAP_SIZE_X; i+=50){
        ctx.moveTo(i+centerX-zoomLeft, 0);
        ctx.lineTo(i+centerX-zoomLeft, MAP_SIZE_Y);
    }
    for(j = -MAP_SIZE_Y; j<MAP_SIZE_Y; j+=50){
        ctx.moveTo(0, j+centerY-zoomTop);
        ctx.lineTo(MAP_SIZE_X, j+centerY-zoomTop);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX-zoomLeft, 0);
    ctx.lineTo(centerX-zoomLeft, 1000);
    ctx.moveTo(0, centerY-zoomTop);
    ctx.lineTo(1000, centerY-zoomTop);
    ctx.closePath();
    ctx.stroke();
    
    //ctx.fillRect(objX-zoomLeft+centerX, objY-zoomTop+centerY, objSize, objSize); 

    items.forEach(item => item.draw(ctx));

    ctx.restore();

    // 倍率の描画
    ctx.font = '30px "arial black"';
    ctx.fillStyle = 'white';
    ctx.fillText('x' + canvasScale.toFixed(1), 0, 30);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeText('x' + canvasScale.toFixed(1), 0, 30);

    //console.log(zoomHeight)
}

function canvasZoom(e) {
    // Canvas上マウス座標の取得
    let rect = e.target.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    if (e.wheelDelta > 0) {
        canvasScaleIndex++;
        canvasScale = 1 + canvasScaleIndex * SCALE_STEP;
        if (canvasScale > MAX_SCALE) {
            canvasScale = MAX_SCALE;
            canvasScaleIndex--;
        } else {
            zoomWidth = canvas.width / canvasScale;
            zoomHeight = canvas.height / canvasScale;

            zoomLeft += mouseX * SCALE_STEP / (canvasScale * (canvasScale - SCALE_STEP));
            zoomLeft = Math.max(-MAP_SIZE_X + zoomWidth/2, Math.min(MAP_SIZE_X - zoomWidth/2, zoomLeft));

            zoomTop += mouseY * SCALE_STEP / (canvasScale * (canvasScale - SCALE_STEP));
            zoomTop = Math.max(-MAP_SIZE_Y + zoomHeight/2, Math.min(MAP_SIZE_Y - zoomHeight/2, zoomTop));
        }
    } else {
        canvasScaleIndex--;
        canvasScale = 1 + canvasScaleIndex * SCALE_STEP;
        if (canvasScale < 1) {
            canvasScale = 1;
            //zoomLeft = 0;
            //zoomTop = 0;
            canvasScaleIndex = 0;
        } else {
            zoomWidth = canvas.width / canvasScale;
            zoomHeight = canvas.height / canvasScale;
            
            zoomLeft -= mouseX * SCALE_STEP / (canvasScale * (canvasScale + SCALE_STEP));
            zoomLeft = Math.max(-MAP_SIZE_X + zoomWidth/2, Math.min(MAP_SIZE_X - zoomWidth/2, zoomLeft));
            
            zoomTop -= mouseY * SCALE_STEP / (canvasScale * (canvasScale + SCALE_STEP));
            zoomTop = Math.max(-MAP_SIZE_Y + zoomHeight/2, Math.min(MAP_SIZE_Y - zoomHeight/2, zoomTop));
        }
    }

    draw();
}

// マウス移動時の処理
function mouseMove(e) {
    let rect = e.target.getBoundingClientRect();
    if (press) {
        // ドラッグ処理
        mouseDragX = e.clientX - rect.left;
        mouseDragY = e.clientY - rect.top;
        
        zoomLeft = zoomLeftBuf + (mouseMoveX - mouseDragX) / canvasScale;
        zoomLeft = Math.max(-MAP_SIZE_X + zoomWidth/2, Math.min(MAP_SIZE_X - zoomWidth/2, zoomLeft));

        zoomTop = zoomTopBuf + (mouseMoveY - mouseDragY) / canvasScale;
        zoomTop = Math.max(-MAP_SIZE_Y + zoomHeight/2, Math.min(MAP_SIZE_Y - zoomHeight/2, zoomTop));

        draw();
    } else {
        // 移動座標の記録
        mouseMoveX = e.clientX - rect.left;
        mouseMoveY = e.clientY - rect.top; 
    }

}

window.addEventListener( "DOMContentLoaded" , ()=> {

    const cvs = document.getElementById("canvas");
    cvs.addEventListener("click",e=>{
        const rect = e.target.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;

            // ブラウザ上でのクリック座標をキャンバス上に変換
        const   canvasX = Math.trunc(zoomLeft + mouseX / canvasScale - canvas.width/2),
                canvasY = Math.trunc(zoomTop +  mouseY / canvasScale  - canvas.height/2);

        text_pos_x.value = canvasX;
        text_pos_z.value = canvasY;
        console.log(canvasX, canvasY);


        items.forEach(item => {
            item.hit(canvasX, canvasY);
            if(item.hitted){
                text_description.textContent = item.description;
            }
        });

        draw();
    });
});

// Cnavas上ではブラウザのスクロールを無効に
function disableScroll() {document.addEventListener("mousewheel", scrollControl, { passive: false });}
function enableScroll() {document.removeEventListener("mousewheel", scrollControl, { passive: false });}
function scrollControl(e) {e.preventDefault();}

init();
draw();