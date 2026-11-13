/** Whole green Chamisul-style bottle: original Canvas artwork, not a cropped cap. */
export function drawRedCapBottle(c,x=0,y=0,size=1,rotation=0){
 c.save();c.translate(x,y);c.rotate(rotation);c.scale(size,size);
 const glass=c.createLinearGradient(-8,0,8,0);glass.addColorStop(0,'#083e26');glass.addColorStop(.28,'#279d58');glass.addColorStop(.47,'#86d989');glass.addColorStop(.64,'#23894c');glass.addColorStop(1,'#06482c');
 c.beginPath();c.moveTo(-3.4,-16);c.lineTo(-3.4,-9);c.bezierCurveTo(-3.4,-6,-7.7,-5,-7.7,-1);c.lineTo(-7.7,16);c.quadraticCurveTo(-7.7,19,0,19);c.quadraticCurveTo(7.7,19,7.7,16);c.lineTo(7.7,-1);c.bezierCurveTo(7.7,-5,3.4,-6,3.4,-9);c.lineTo(3.4,-16);c.closePath();c.fillStyle=glass;c.fill();c.strokeStyle='#b4efd2';c.lineWidth=.65;c.stroke();
 c.fillStyle='#da203c';c.beginPath();c.roundRect(-4,-20,8,5,1);c.fill();c.fillStyle='#ff7282';c.fillRect(-3.4,-19.7,6.8,.8);c.strokeStyle='#8c152d';c.lineWidth=.5;for(let xx=-2.5;xx<4;xx+=1.5){c.beginPath();c.moveTo(xx,-18.4);c.lineTo(xx,-15.7);c.stroke();}
 c.fillStyle='#f4f3df';c.beginPath();c.roundRect(-6.7,1,13.4,11,1);c.fill();c.fillStyle='#16442a';c.textAlign='center';c.textBaseline='middle';c.font='900 4.7px "Noto Sans KR",sans-serif';c.fillText('참이슬',0,5);c.fillStyle='#c82738';c.font='800 2.2px "Noto Sans KR",sans-serif';c.fillText('오리지널',0,9);
 c.strokeStyle='#dbffe795';c.lineWidth=1.1;c.beginPath();c.moveTo(-5,-1);c.lineTo(-5,15);c.stroke();c.strokeStyle='#d2ffc761';c.lineWidth=.7;c.beginPath();c.moveTo(-1.8,-13.5);c.lineTo(-1.8,-8.5);c.stroke();c.restore();
}
