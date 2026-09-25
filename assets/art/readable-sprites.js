// Wayfarer Guild readability-first sprite set.
// Original project artwork: tiny 24x24 silhouettes with oversized job/monster anchors.
(function(){
  const J={
    outline:'#241b18', skin:'#d99b72', skin2:'#b97858', hair:'#5a3528',
    white:'#f4ead7', steel:'#9aa7b0', steelD:'#58636c', gold:'#e6bd4f',
    red:'#b8443d', redL:'#dd6558', blue:'#3d6f9a', blueL:'#67a2ca',
    green:'#4d7d45', greenL:'#79a95c', purple:'#6b4c8e', purpleL:'#9a78b8',
    brown:'#7a4c2f', brownL:'#b57a46', black:'#28262d', blackL:'#484653',
    parchment:'#d9c58c'
  };
  function R(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h)}
  function P(g,pts,c){g.fillStyle=c;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();g.fill()}
  function L(g,x1,y1,x2,y2,c,w=1){g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(x1+.5,y1+.5);g.lineTo(x2+.5,y2+.5);g.stroke()}
  function eye(g,x,y){R(g,x,y,1,1,J.outline)}
  function face(g,{helmet=false,hair=J.hair,skin=J.skin}={}){
    R(g,8,5,8,7,J.outline);R(g,9,6,6,6,skin);
    R(g,9,6,6,2,hair);R(g,9,8,1,2,hair);eye(g,11,9);eye(g,14,9);
  }
  function body(g,color,trim=J.outline,wide=0){
    R(g,7-wide,12,10+wide*2,8,J.outline);R(g,8-wide,13,8+wide*2,6,color);
    R(g,9-wide,19,3,4,J.outline);R(g,13+wide,19,3,4,J.outline);
    R(g,9-wide,19,2,3,trim);R(g,14+wide,19,2,3,trim);
  }
  function cape(g,c){P(g,[[7,13],[5,20],[10,19],[10,13]],c)}
  function sword(g,x=18,y=13,c=J.steel){L(g,x,y,x+3,y-5,J.outline,3);L(g,x,y,x+3,y-5,c,1);R(g,x-1,y,4,2,J.gold);R(g,x,y+2,2,3,J.brown)}
  function shieldRound(g,x=4,y=13,c=J.blue){R(g,x,y,5,7,J.outline);R(g,x+1,y+1,3,5,c);R(g,x+2,y+2,1,3,J.gold)}
  function shieldTower(g,x=3,y=12,c=J.steelD){P(g,[[x,y],[x+6,y],[x+6,y+7],[x+3,y+10],[x,y+7]],J.outline);P(g,[[x+1,y+1],[x+5,y+1],[x+5,y+6],[x+3,y+8],[x+1,y+6]],c);R(g,x+2,y+2,2,5,J.white)}
  function staff(g,x=19,y=7,c=J.brown,gem=J.purpleL){L(g,x,y+2,x-2,22,J.outline,3);L(g,x,y+2,x-2,22,c,1);R(g,x-2,y-1,5,5,J.outline);R(g,x-1,y,3,3,gem)}
  function hammer(g,x=18,y=11){L(g,x-1,y+1,x-3,22,J.outline,3);L(g,x-1,y+1,x-3,22,J.brownL,1);R(g,x-3,y-2,7,5,J.outline);R(g,x-2,y-1,5,3,J.steel)}
  function hoe(g,x=19,y=9){L(g,x,y,x-3,22,J.outline,3);L(g,x,y,x-3,22,J.brownL,1);L(g,x-1,y,x+3,y+2,J.outline,3);L(g,x-1,y,x+3,y+2,J.steel,1)}
  function bow(g,x=19,y=9){for(let i=0;i<8;i++){R(g,x+(i<4?i:7-i),y+i,1,1,J.brownL)}L(g,x+1,y,x+1,y+7,J.parchment,1);L(g,x+1,y+3,x-3,y+3,J.outline,1)}
  function book(g,x=17,y=14,c=J.blue){R(g,x,y,6,6,J.outline);R(g,x+1,y+1,2,4,c);R(g,x+3,y+1,2,4,J.parchment);R(g,x+3,y+1,1,4,J.outline)}
  function crossStaff(g){L(g,19,9,17,22,J.outline,3);L(g,19,9,17,22,J.gold,1);R(g,16,6,7,2,J.outline);R(g,18,4,2,7,J.outline);R(g,17,7,5,1,J.white);R(g,19,5,1,5,J.white)}
  function hatPoint(g,c,band=J.gold){
    P(g,[[7,7],[12,1],[18,7]],J.outline);P(g,[[8,6],[12,2],[17,6]],c);R(g,6,7,13,3,J.outline);R(g,7,8,11,1,c);R(g,10,6,5,1,band)
  }
  function hood(g,c){
    P(g,[[7,9],[8,4],[12,2],[17,5],[18,10]],J.outline);P(g,[[8,9],[9,5],[12,3],[16,6],[17,10]],c);R(g,9,7,7,5,J.skin);R(g,10,7,5,2,J.hair);eye(g,11,9);eye(g,14,9)
  }
  function strawHat(g){R(g,5,5,14,3,J.outline);R(g,6,6,12,1,'#d6b456');R(g,8,2,8,5,J.outline);R(g,9,3,6,3,'#e7c96b');R(g,9,5,6,1,J.brown)}
  function helm(g,c=J.steel,plume=null){
    R(g,7,4,10,8,J.outline);R(g,8,5,8,6,c);R(g,8,8,8,2,J.steelD);R(g,10,9,2,1,J.black);R(g,14,9,1,1,J.black);
    if(plume){R(g,11,1,3,4,J.outline);R(g,12,1,2,3,plume)}
  }
  function goggles(g){R(g,9,8,7,3,J.outline);R(g,10,9,2,1,J.blueL);R(g,14,9,1,1,J.blueL)}

  const jobs={
    adventurer(g){cape(g,J.red);face(g);body(g,J.brownL,J.green);R(g,8,14,8,2,J.green);sword(g,18,14,J.steel)},
    fighter(g){shieldRound(g,3,12,J.blue);helm(g,J.steel,J.red);body(g,J.blue,J.steel,1);R(g,8,14,10,2,J.steelD);sword(g,18,13,J.white)},
    archer(g){hood(g,J.green);body(g,J.greenL,J.brown);R(g,7,14,10,2,J.brown);R(g,5,9,2,8,J.brown);R(g,4,8,1,7,J.parchment);bow(g,18,8)},
    mage(g){cape(g,J.purple);hatPoint(g,J.purple,J.gold);R(g,9,9,6,4,J.skin);eye(g,11,10);eye(g,14,10);body(g,J.purpleL,J.purple);R(g,10,14,5,1,J.gold);staff(g,19,6,J.brown,J.redL)},
    cleric(g){hood(g,J.white);R(g,8,6,9,2,J.gold);body(g,J.white,J.gold);R(g,10,13,4,6,J.blueL);crossStaff(g)},
    knight(g){shieldTower(g,2,11,J.steelD);helm(g,J.steel,J.blueL);body(g,J.steelD,J.steel,1);R(g,9,13,8,6,J.steel);R(g,10,15,6,2,J.blue);sword(g,19,13,J.white)},
    ninja(g){P(g,[[6,8],[10,3],[16,4],[18,9],[16,12],[8,12]],J.outline);P(g,[[7,8],[10,4],[15,5],[17,9],[15,11],[9,11]],J.black);R(g,9,8,7,3,J.skin);R(g,10,8,5,1,J.black);eye(g,11,9);eye(g,14,9);body(g,J.black,J.blackL);P(g,[[7,12],[3,9],[5,14]],J.red);L(g,4,17,9,13,J.steel,2);L(g,17,13,22,17,J.steel,2)},
    wizard(g){hatPoint(g,J.blue,J.white);R(g,9,9,6,4,J.skin);eye(g,11,10);eye(g,14,10);body(g,J.blueL,J.blue);R(g,9,15,7,1,J.white);staff(g,20,5,J.brown,J.blueL);R(g,10,2,1,1,J.white);R(g,15,5,1,1,J.white)},
    paladin(g){shieldTower(g,2,11,J.white);helm(g,J.white,J.gold);body(g,J.white,J.gold,1);R(g,9,13,8,6,J.blueL);R(g,11,14,4,4,J.gold);sword(g,19,13,J.gold)},
    blacksmith(g){R(g,7,5,10,3,J.outline);R(g,8,6,8,1,J.red);face(g,{hair:J.black});body(g,J.brown,J.steelD,1);R(g,9,13,8,7,'#5b3c2b');R(g,10,14,6,5,J.brownL);R(g,12,14,1,5,J.steel);hammer(g,19,10)},
    farmer(g){strawHat(g);R(g,9,7,6,5,J.skin);R(g,10,7,5,2,J.hair);eye(g,11,9);eye(g,14,9);body(g,J.greenL,J.brown);R(g,9,13,7,3,J.white);hoe(g,19,8)},
    researcher(g){R(g,7,4,10,4,J.outline);R(g,8,5,8,2,J.blue);R(g,10,3,5,2,J.blueL);face(g,{hair:J.brown});goggles(g);body(g,J.parchment,J.blue);R(g,8,13,9,2,J.blueL);book(g,17,14,J.blue);R(g,5,14,3,6,J.brown)}
  };

  function mEye(g,x,y,c=J.white){R(g,x,y,3,3,J.outline);R(g,x+1,y+1,1,1,c)}
  const monsters={
    slime(g){P(g,[[5,16],[6,11],[9,8],[15,8],[18,11],[19,16],[17,19],[7,19]],J.outline);P(g,[[6,16],[7,11],[10,9],[14,9],[17,12],[18,16],[16,18],[8,18]],'#6fc54b');R(g,9,13,2,2,J.outline);R(g,15,13,2,2,J.outline);R(g,11,17,4,1,'#3a7833')},
    bat(g){P(g,[[12,10],[7,6],[2,7],[5,11],[1,12],[6,16],[10,14]],J.outline);P(g,[[12,10],[17,6],[22,7],[19,11],[23,12],[18,16],[14,14]],J.outline);P(g,[[11,11],[8,8],[4,8],[7,12],[4,13],[8,15],[11,13]],'#65507e');P(g,[[13,11],[16,8],[20,8],[17,12],[20,13],[16,15],[13,13]],'#65507e');R(g,10,9,5,7,J.outline);R(g,11,10,3,5,'#8a5d75');mEye(g,11,11);R(g,8,5,2,3,J.outline);R(g,15,5,2,3,J.outline)},
    bee(g){P(g,[[7,10],[4,7],[2,8],[5,12],[7,12]],J.outline);P(g,[[17,10],[20,7],[22,8],[19,12],[17,12]],J.outline);P(g,[[8,8],[16,8],[19,12],[16,17],[8,17],[5,12]],J.outline);R(g,8,9,8,2,'#e6bd4f');R(g,7,12,10,2,J.black);R(g,8,15,8,1,'#e6bd4f');mEye(g,9,10);R(g,16,11,4,2,J.outline)},
    boar(g){P(g,[[3,14],[5,10],[9,8],[16,9],[20,12],[21,16],[18,19],[7,19],[3,17]],J.outline);P(g,[[4,14],[6,11],[10,9],[16,10],[19,12],[20,16],[17,18],[7,18],[4,16]],'#8a583a');R(g,15,11,6,5,'#b87952');R(g,17,13,3,2,'#5a3528');R(g,20,12,2,2,J.white);R(g,20,16,2,2,J.white);R(g,6,17,3,5,J.outline);R(g,15,17,3,5,J.outline);R(g,7,7,3,4,J.outline);mEye(g,14,11)},
    wolf(g){P(g,[[4,15],[6,9],[9,6],[14,7],[18,10],[21,13],[18,17],[8,18]],J.outline);P(g,[[5,15],[7,10],[10,7],[14,8],[17,10],[20,13],[17,16],[8,17]],'#77717b');P(g,[[8,8],[7,3],[11,6]],J.outline);P(g,[[15,8],[17,3],[18,10]],J.outline);P(g,[[18,11],[23,10],[20,14]],'#a39ca4');R(g,18,12,3,2,J.outline);mEye(g,12,10);R(g,7,16,3,5,J.outline);R(g,15,16,3,5,J.outline)},
    goblin(g){P(g,[[7,7],[3,5],[6,10]],J.outline);P(g,[[17,7],[21,5],[18,10]],J.outline);R(g,7,5,10,8,J.outline);R(g,8,6,8,6,'#6f963f');mEye(g,9,8);mEye(g,14,8);R(g,11,11,3,1,J.outline);R(g,7,13,10,7,J.outline);R(g,8,14,8,5,'#8a6038');L(g,19,12,22,20,J.brown,3);R(g,18,11,5,3,J.outline);R(g,19,12,3,1,J.steelD)},
    skeleton(g){R(g,8,4,9,8,J.outline);R(g,9,5,7,6,J.white);R(g,10,7,2,2,J.outline);R(g,14,7,1,2,J.outline);R(g,11,10,4,1,J.outline);R(g,11,12,3,8,J.white);R(g,8,14,9,2,J.white);R(g,9,17,7,1,J.white);R(g,8,20,2,3,J.white);R(g,15,20,2,3,J.white);L(g,7,14,4,20,J.white,2);L(g,17,14,20,20,J.white,2)},
    orc(g){P(g,[[6,5],[18,5],[20,9],[18,13],[6,13],[4,9]],J.outline);P(g,[[7,6],[17,6],[19,9],[17,12],[7,12],[5,9]],'#6c823d');mEye(g,8,8);mEye(g,15,8);R(g,6,11,3,3,J.white);R(g,16,11,3,3,J.white);R(g,5,13,14,8,J.outline);R(g,6,14,12,6,'#70513d');R(g,3,14,4,6,'#6c823d');R(g,18,14,4,6,'#6c823d');R(g,7,20,4,3,J.outline);R(g,14,20,4,3,J.outline)},
    cyclops(g){R(g,5,3,14,11,J.outline);R(g,6,4,12,10,'#d58b5d');R(g,8,7,8,5,J.outline);R(g,9,8,6,3,J.white);R(g,11,8,2,3,J.outline);R(g,7,13,11,8,J.outline);R(g,8,14,9,6,'#9f6747');R(g,3,14,5,6,'#d58b5d');R(g,17,14,5,6,'#d58b5d');R(g,8,20,4,3,J.outline);R(g,14,20,4,3,J.outline)},
    mushroom(g){P(g,[[4,10],[6,5],[10,2],[15,3],[19,6],[21,11]],J.outline);P(g,[[5,10],[7,6],[10,3],[15,4],[18,7],[20,10]],'#d85f4c');R(g,8,5,3,2,J.white);R(g,15,6,3,2,J.white);R(g,9,10,7,10,J.outline);R(g,10,11,5,8,'#e1c49b');mEye(g,10,14);mEye(g,14,14);R(g,7,19,4,3,J.outline);R(g,15,19,4,3,J.outline)},
    ghost(g){P(g,[[7,19],[6,12],[8,6],[12,3],[16,6],[18,12],[17,20],[14,18],[12,21],[10,18]],J.outline);P(g,[[8,18],[7,12],[9,7],[12,4],[15,7],[17,12],[16,18],[14,17],[12,19],[10,17]],'#d9dcef');R(g,9,10,2,3,J.outline);R(g,14,10,2,3,J.outline);R(g,11,15,4,1,J.outline)},
    dragon(g){P(g,[[7,12],[3,7],[2,13],[6,15]],J.outline);P(g,[[17,12],[21,7],[22,13],[18,15]],J.outline);R(g,7,6,10,12,J.outline);R(g,8,7,8,10,'#a84645');P(g,[[8,7],[6,2],[10,5]],J.outline);P(g,[[16,7],[18,2],[14,5]],J.outline);R(g,10,9,2,2,J.white);R(g,14,9,2,2,J.white);R(g,11,14,4,2,'#d88955');P(g,[[16,17],[22,19],[18,21]],J.outline);R(g,8,18,3,4,J.outline);R(g,14,18,3,4,J.outline)}
  };

  window.CUSTOM_SPRITE_DRAWERS={jobs,monsters};
})();