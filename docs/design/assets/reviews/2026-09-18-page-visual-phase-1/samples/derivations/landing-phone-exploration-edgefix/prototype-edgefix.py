from PIL import Image
SRC='docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/landing-phone-exploration-3r/phone-architecture.png'
s=Image.open(SRC).convert('RGB');W,H=s.size;px=s.load()
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
N=12; WIN=24
cache={}
def colmean(x,y0,y1): return sum(L(px[x,y]) for y in range(y0,y1))/(y1-y0)
out=s.copy();op=out.load()
for seam in (390,780):
  left_ref,right_ref=seam-N-2,seam+N+1
  for y in range(H):
    y0=max(0,y-WIN);y1=min(H,y+WIN)
    a=colmean(left_ref,y0,y1);b=colmean(right_ref,y0,y1)
    for x in range(seam-N,seam+N):
      t=(x-(seam-N-2))/(2*N+3)
      target=a*(1-t)+b*t
      cur=colmean(x,y0,y1)
      g=max(1.0,min(1.6,target/max(cur,1)))
      w=1-abs((x+0.5)-seam)/N  # strongest at seam
      g=1+(g-1)*max(0,w)
      p=px[x,y];op[x,y]=tuple(min(255,round(c*g)) for c in p)
out.save('.tmp/claude-review/edgefix-arch.png')
def lum(img,x,y0,y1):
  q=img.load();return round(sum(L(q[x,y]) for y in range(y0,y1))/(y1-y0))
for band,(y0,y1) in {'wall':(60,220),'floor':(250,430),'fore':(430,600)}.items():
  print(band,'L',[lum(out,x,y0,y1) for x in range(370,410,4)],' R',[lum(out,x,y0,y1) for x in range(762,800,4)])
diff=[x for x in range(W) if any(px[x,y]!=op[x,y] for y in range(H))];print('changed cols',diff[0],diff[-1],len(diff))
