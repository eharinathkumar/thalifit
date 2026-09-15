function dayKey(offset){
  const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10);
}
function ts(offset,hour=12){const d=new Date(`${dayKey(offset)}T${String(hour).padStart(2,'0')}:00:00`);return d.getTime();}
function food(id,name,cal,protein,meal,offset,carbs=30,fat=10){return{id, name, cal, protein, carbs, fat, qty:1, meal, ts:ts(offset,12)};}
function strength(id,name,detail,offset,minutes=35,cal=150){return{id,exId:id,name,type:'strength',detail,sets:3,reps:10,weight:20,minutes,cal,ts:ts(offset,18)};}
function cardio(id,name,offset,minutes=35,cal=220){return{id,exId:id,name,type:'cardio',detail:`${minutes} min`,minutes,cal,ts:ts(offset,18)};}

const personas=[
  {
    id:'priya', name:'Priya', diet:'vegetarian', units:'metric', weightKg:68.4, startWeightKg:69.3, heightCm:164, age:39,
    goal:'lose', goalWeightKg:64, cuisines:['Indian','Greek'], allergies:'Peanuts', dislikes:'Mushrooms', targets:{cal:1850,protein:105},
    foods:[
      [food('p1','Greek Yogurt Berry Bowl',360,29,'Morning',-2,42,9),food('p2','Chana Masala + Rice',510,20,'Afternoon',-2,78,12),food('p3','Paneer Tikka Bowl',560,38,'Evening',-2,54,22)],
      [food('p4','Oatmeal with berries',340,16,'Morning',-1,58,8),food('p5','Rajma rice bowl',530,23,'Afternoon',-1,82,10),food('p6','Palak Paneer',520,34,'Evening',-1,30,26)],
      [food('p7','2 egg omelet',290,23,'Morning',0,8,18),food('p8','Lentil Power Bowl',460,24,'Afternoon',0,67,12),food('p9','Paneer veggie wrap',510,32,'Evening',0,50,21)]
    ],
    activity:{
      '-2':[strength('ps1','Dumbbell Romanian Deadlift','3×10 @ 20 kg',-2,34,145),strength('ps2','Dumbbell Bench Press','3×10 @ 12 kg',-2,28,115)],
      '-1':[cardio('pc1','Brisk Walk',-1,42,205)],
      '0':[strength('ps3','Goblet Squat','3×12 @ 16 kg',0,32,135)]
    },
    pantry:[['chickpeas','Chickpeas / chana'],['rice','Cooked rice'],['spinach','Spinach'],['paneer','Paneer'],['tomato','Tomato']]
  },
  {
    id:'maya', name:'Maya', diet:'vegan', units:'metric', weightKg:61.8, startWeightKg:62.1, heightCm:168, age:31,
    goal:'maintain', goalWeightKg:62, cuisines:['Thai','Mexican'], allergies:'Soy', dislikes:'Olives', targets:{cal:2050,protein:95},
    foods:[
      [food('m1','Oatmeal with banana and chia',390,14,'Morning',-2,68,10),food('m2','Black Bean Burrito Bowl',520,22,'Afternoon',-2,88,12),food('m3','Lentil Power Bowl',460,24,'Evening',-2,67,12)],
      [food('m4','Berry smoothie with oat milk',330,11,'Morning',-1,61,7),food('m5','Chickpea quinoa salad',480,21,'Afternoon',-1,70,13),food('m6','Vegetable curry with rice',540,17,'Evening',-1,91,12)],
      [food('m7','Overnight oats',370,13,'Morning',0,63,9),food('m8','Bean tacos',500,19,'Afternoon',0,76,14),food('m9','Chana Masala + Rice',510,20,'Evening',0,78,12)]
    ],
    activity:{
      '-2':[cardio('mc1','Yoga Flow',-2,45,135)],
      '-1':[cardio('mc2','Cycling',-1,38,260)],
      '0':[cardio('mc3','Brisk Walk',0,50,235)]
    },
    pantry:[['chickpeas','Chickpeas / chana'],['rice','Cooked rice'],['lentils','Cooked lentils'],['quinoa','Cooked quinoa'],['tomato','Tomato']]
  },
  {
    id:'marcus', name:'Marcus', diet:'meat', units:'imperial', weightKg:84.7, startWeightKg:85.9, heightCm:181, age:44,
    goal:'lose', goalWeightKg:79.4, cuisines:['American','Mexican'], allergies:'', dislikes:'Cottage cheese', targets:{cal:2350,protein:155},
    foods:[
      [food('r1','Egg and veggie breakfast',430,31,'Morning',-2,29,22),food('r2','Chicken burrito bowl',680,52,'Afternoon',-2,74,22),food('r3','Turkey chili',610,48,'Evening',-2,56,21)],
      [food('r4','Greek yogurt and granola',410,32,'Morning',-1,46,11),food('r5','Chicken sandwich',650,50,'Afternoon',-1,61,21),food('r6','Salmon rice bowl',690,49,'Evening',-1,72,24)],
      [food('r7','3 egg omelet',390,29,'Morning',0,11,26),food('r8','Grilled chicken wrap',620,51,'Afternoon',0,54,21),food('r9','Lean beef rice bowl',710,50,'Evening',0,78,24)]
    ],
    activity:{
      '-2':[strength('rs1','Dumbbell Bench Press','4×10 @ 45 lb',-2,38,180),strength('rs2','Romanian Deadlift','4×10 @ 70 lb',-2,34,170)],
      '-1':[cardio('rc1','Run',-1,30,360)],
      '0':[strength('rs3','One-arm Row','3×12 @ 40 lb',0,32,155)]
    },
    pantry:[['egg','Eggs'],['rice','Cooked rice'],['pepper','Bell pepper'],['onion','Onion'],['tomato','Tomato']]
  },
  {
    id:'elena', name:'Elena', diet:'eggitarian', units:'metric', weightKg:57.3, startWeightKg:57.0, heightCm:160, age:36,
    goal:'gain', goalWeightKg:59, cuisines:['Mediterranean','Indian'], allergies:'Tree nuts', dislikes:'Tempeh', targets:{cal:2100,protein:110},
    foods:[
      [food('e1','Veggie Omelet',330,25,'Morning',-2,16,20),food('e2','Quinoa chickpea bowl',490,22,'Afternoon',-2,72,13),food('e3','Egg curry with rice',560,27,'Evening',-2,69,19)],
      [food('e4','Avocado Egg Toast',420,21,'Morning',-1,41,22),food('e5','Greek salad with eggs',450,26,'Afternoon',-1,32,24),food('e6','Dal with rice',520,23,'Evening',-1,84,9)],
      [food('e7','Veggie Omelet',330,25,'Morning',0,16,20),food('e8','Lentil Power Bowl',460,24,'Afternoon',0,67,12),food('e9','Egg fried rice',570,29,'Evening',0,79,16)]
    ],
    activity:{
      '-2':[strength('es1','Resistance Band Row','3×15',-2,30,105)],
      '-1':[cardio('ec1','Swimming',-1,35,250)],
      '0':[cardio('ec2','Pilates',0,40,150)]
    },
    pantry:[['egg','Eggs'],['spinach','Spinach'],['rice','Cooked rice'],['lentils','Cooked lentils'],['avocado','Avocado']]
  }
];

function buildStorage(p){
  const now=Date.now();
  const profile={
    name:p.name,units:p.units,diet:p.diet,cuisines:p.cuisines,indianStyle:'surprise',exploreCuisines:true,
    goalWeightKg:p.goalWeightKg,conditions:[],allergies:p.allergies,dislikes:p.dislikes,age:p.age,sex:'unspecified',
    weightKg:p.weightKg,heightCm:p.heightCm,activity:'moderate',steps:8500,goal:p.goal,created:now-45*86400000,
    plan:{daily_calories:p.targets.cal,protein_g:p.targets.protein,summary:'QC seeded plan',habits:['Log meals','Stay active'],created:now-45*86400000,startWeightKg:p.startWeightKg,weekly_rate_kg:p.goal==='lose'?-0.25:p.goal==='gain'?0.15:0,lastCheckin:now-8*86400000,nextCheckinAt:now-1000,coach_notes:`QC persona ${p.id}`},
    checkinHistory:[]
  };
  const storage={
    mdp_profile:profile,
    mdp_targets:p.targets,
    mdp_weights:[{date:dayKey(-14),kg:p.startWeightKg},{date:dayKey(0),kg:p.weightKg}],
    mdp_activity:{},
    mdp_readings:[],
    mdp_kitchen_pantry:p.pantry.map((x,i)=>({id:`${p.id}-pantry-${i}`,k:x[0],n:x[1],low:false})),
    mdp_kitchen_groceries:['Broccoli','Berries','Whole-grain bread','Yogurt','Cucumber'].map((n,i)=>({id:`${p.id}-g-${i}`,k:n.toLowerCase().replace(/\s+/g,'-'),n,done:false})),
    mdp_kitchen_planned:[],
    mdp_schema_version:3
  };
  p.foods.forEach((rows,i)=>{storage[`mdp_log_${dayKey(i-2)}`]=rows;});
  for(const [offset,rows] of Object.entries(p.activity)) storage.mdp_activity[dayKey(Number(offset))]=rows;
  return Object.fromEntries(Object.entries(storage).map(([k,v])=>[k,JSON.stringify(v)]));
}

module.exports={personas,buildStorage,dayKey};
