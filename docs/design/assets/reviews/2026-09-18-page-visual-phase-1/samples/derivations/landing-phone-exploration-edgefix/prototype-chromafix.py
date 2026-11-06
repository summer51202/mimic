from PIL import Image
import colorsys
D='docs/design/assets/reviews/2026-09-18-page-visual-phase-1/samples/'
src=Image.open(D+'landing-phone-exploration-3r2/phone-architecture.png').convert('YCbCr');W,H=src.size;p=src.load()
out=src.copy();o=out.load();N=12;WIN=24
def m(x,y0,y1,i): return sum(p[x,y][i] for y in range(y0,y1))/(y1-y0)
for seam in (390,780):
  la,ra=seam-N-2,seam+N+1
  for y in range(H):
    y0=max(0,y-WIN);y1=min(H,y+WIN)
    rb=[m(la,y0,y1,1),m(ra,y0,y1,1)];rr=[m(la,y0,y1,2),m(ra,y0,y1,2)]
    for x in range(seam-N,seam+N):
      t=(x-la)/(ra-la);w=max(0,1-abs((x+0.5)-seam)/N)
      tb=rb[0]*(1-t)+rb[1]*t;tr=rr[0]*(1-t)+rr[1]*t
      cb=m(x,y0,y1,1);cr=m(x,y0,y1,2)
      Y,Cb,Cr=p[x,y]
      o[x,y]=(Y,round(Cb+(tb-cb)*w),round(Cr+(tr-cr)*w))
rgb=out.convert('RGB');rgb.save('.tmp/claude-review/chromafix-arch.png')
q=rgb.load()
def sat(x,y0,y1): return round(sum(colorsys.rgb_to_hsv(*[c/255 for c in q[x,y]])[1] for y in range(y0,y1))/(y1-y0),3)
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def lum(x,y0,y1): return round(sum(L(q[x,y]) for y in range(y0,y1))/(y1-y0))
for band,(y0,y1) in {'wall':(60,220),'floor':(250,430),'fore':(430,600)}.items():
  print(band,'S',[sat(x,y0,y1) for x in range(374,406,4)],[sat(x,y0,y1) for x in range(766,798,4)])
  print(band,'L',[lum(x,y0,y1) for x in range(374,406,4)],[lum(x,y0,y1) for x in range(766,798,4)])
z=Image.new('RGB',(740,1500));z.paste(rgb.crop((360,0,420,600)).resize((360,1800),Image.NEAREST).crop((0,0,360,1500)),(0,0));z.paste(rgb.crop((750,0,810,600)).resize((360,1800),Image.NEAREST).crop((0,0,360,1500)),(380,0));z.resize((370,750)).save('.tmp/claude-review/chromafix-zoom.png')
base=Image.open(D+'landing-phone-exploration-3r2/phone-architecture.png').convert('RGB')
s=Image.new('RGB',(1170,1210),(20,20,20));s.paste(base,(0,0));s.paste(rgb,(0,610));s.resize((780,807)).save('.tmp/claude-review/chromafix-compare.png')
