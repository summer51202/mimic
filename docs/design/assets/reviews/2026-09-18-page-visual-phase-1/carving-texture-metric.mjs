 // Self-contained so the local-file positioning tool can use the same metric.
export function measureCarving(wall, sprite, x, y) {
  const {width, height}=sprite;
  if(x<0||y<0||x+width>wall.width||y+height>wall.height)return null;
  const luma=(data,i)=>(2126*data[i]+7152*data[i+1]+722*data[i+2])/10000;
  const base=[],ink=[];
  for(let v=0;v<height;v++)for(let u=0;u<width;u++){
    const i=((y+v)*wall.width+x+u)*4,j=(v*width+u)*4;
    base.push(luma(wall.data,i));
    const alpha=sprite.data[j+3]/255;
    ink.push(alpha*luma(sprite.data,j)+(1-alpha)*base.at(-1));
  }
  const texture=[];
  let total=0,count=0;
  function pair(a,b){
    texture.push(Math.abs(base[a]-base[b]));
    if(Boolean(sprite.data[a*4+3])!==Boolean(sprite.data[b*4+3])){
      total+=sprite.data[a*4+3]?ink[a]-ink[b]:ink[b]-ink[a];
      count++;
    }
  }
  for(let v=0;v<height;v++)for(let u=0;u<width;u++){
    const i=v*width+u;
    if(u+1<width)pair(i,i+1);
    if(v+1<height)pair(i,i+width);
  }
  texture.sort((a,b)=>a-b);
  const middle=Math.floor(texture.length/2);
  const median=(texture[middle]+texture[Math.floor((texture.length-1)/2)])/2;
  return {ratio:median>0&&count?Math.abs(total/count)/median:null,median,edgeMean:count?Math.abs(total/count):null,count};
}

