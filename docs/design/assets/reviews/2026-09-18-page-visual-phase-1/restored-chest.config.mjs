export const frames=["closed","latch-release","unlatched","cracked","half-open","opening-wide","near-open","open"];
export const mainFrames={closed:"closed",cracked:"cracked","half-open":"half-open",open:"open"};
// One regular source lattice accounts for ImageGen's transparent outer padding.
// No state receives an independent crop fit, offset, or scale.
export const sourceGrid={origin:[20,0],cell:[432,430],stride:[432,430]};
export const timelines={
  open:[["latch-release",100],["unlatched",90],["cracked",150],["half-open",90],["opening-wide",70],["near-open",110],["open",140]],
  close:[["near-open",120],["opening-wide",100],["half-open",80],["cracked",70],["unlatched",90],["latch-release",80],["closed",120]],
};
export const layout={width:104,height:120,sceneOrigin:[92,230],ground:[52,120],worldGround:[144,350],bodyStart:90,latchArea:{x:44,y:68,width:36,height:40},hingeReference:{kind:"review-guide",point:[52,84]}};
export function stateOfFrame(id){
  const n=frames.indexOf(id);if(n<0)throw Error("Unknown frame");
  return n===7?"open":n>=4?"half-open":n===3?"cracked":"closed";
}
