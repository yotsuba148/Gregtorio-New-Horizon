/* Energy conversion uses the existing tank and power transactions. */
(function () {
 'use strict';
 const I = INDUSTRIAL_ENERGY, MB = MULTIBLOCKS, TX = GTTransactions;
 const promoter = 'combustionpromotor';
 const fuelFamilies = [
  {fuelMap:'gt.recipe.dieselgeneratorfuel', coefficient:.04, multiplier:1},
  {fuelMap:'gt.recipe.gasturbinefuel', coefficient:.04, multiplier:1},
  {fuelMap:'gtpp.recipe.rocketenginefuel', coefficient:.005, multiplier:3}
 ];
 const period = 20, startupTolerance = 10 * period;
 const rotorCount = 12;
 const hotFace = '0,3,3', coldFace = '1,4,2';
 const steam = 'ic2superheatedsteam', water = 'ic2distilledwater';
 const heatMap = 'gg.recipe.extreme_heat_exchanger';
 let heatFuels;
 function heatRecipes() {
  if (heatFuels) return heatFuels;
  heatFuels = new Map(CONTENT.recipes(heatMap,true).filter(r=>r.enabled&&!r.fake).map(r=>{
   const [hot,work] = r.fin, [regular,high,cold] = r.fout;
   return [hot.f,{cold:cold.f,maximum:hot.mb,threshold:r.extra.special,
    regular:regular.f,high:high.f,steam:work.mb*160,unit:hot.f.startsWith('plasma.')?1000:1}];
  }));
  return heatFuels;
 }
 const pumpModes = [
  {name:'直接产汽', input:water, inputAmount:161, output:steam, outputAmount:25600},
  {name:'加热冷却液', input:'ic2coolant', inputAmount:192, output:'ic2hotcoolant', outputAmount:192}
 ];

 function fail(m, code, text) {
  m.status = {code:code,text:text};
  return false;
 }
 function stopOutput(m, code, text) {
  I.state(m).power = 0;
  return fail(m,code,text);
 }
 function fitEfficiency(rotor, factor, loose) {
  return loose ? (-.2 + Math.round(rotor.efficiency * 85) * .01) * factor : rotor.efficiency;
 }
 function rotorFits(stack) {
  const r = I.rotor(stack);
  return !!r && (!(r.durability > 0) || (stack.dmg || 0) < r.durability);
 }
 function loadRotors(m) {
  const assemblies = MB.ports(m).filter(p => MB.spec(p.k).type === 'turbineRotor');
  if (assemblies.every(p=>p.items[0])) return assemblies;
  const slots = MB.members(m,'ins');
  const donors = slots.flatMap(p => p.items.map((stack,index) => ({p,index,stack}))).filter(s => rotorFits(s.stack));
  const first = assemblies.find(p=>rotorFits(p.items[0]))?.items[0] || donors[0]?.stack;
  if (!first) return assemblies;
  const expected = I.rotor(first);
  for (const port of assemblies) {
   if (port.items[0]) continue;
   const index = donors.findIndex(d=>{
    const rotor=I.rotor(d.stack);
    return rotor.material===expected.material&&rotor.size===expected.size;
   });
   if (index<0) break;
   const [donor] = donors.splice(index,1);
   port.items[0] = Object.assign({},donor.stack,{n:1});
   const left = donor.stack.n - 1;
   donor.p.items[donor.index] = left>0 ? Object.assign({},donor.stack,{n:left}) : null;
   if (left>0) donors.splice(index,0,{p:donor.p,index:donor.index,stack:donor.p.items[donor.index]});
  }
  return assemblies;
 }
 function wearRotors(assemblies, power) {
  const scaled = power / 5;
  const damage = Math.floor(Math.min(scaled / 5,Math.pow(scaled,.6)));
  for (const port of assemblies) {
   const stack = port.items[0], r = I.rotor(stack);
   if (!r.durability) continue;
   stack.dmg = (stack.dmg || 0) + damage;
   if (stack.dmg >= r.durability) port.items[0] = null;
  }
 }
 function gasValue(f) {
  return f==='benzene' ? 0 : I.fuelValue(fuelFamilies[1],f);
 }
 function gas(m) {
  if (!I.ready(m)) return false;
  const s = I.state(m);
  const assemblies = loadRotors(m);
  if (assemblies.length !== rotorCount || assemblies.some(p => !rotorFits(p.items[0]))) {
   s.shaftPower = s.efficiency = 0;
   return stopOutput(m,'WAITING_INPUT','需要 12 个涡轮转子');
  }
  const rotors = assemblies.map(p => I.rotor(p.items[0]));
  const rotor = rotors[0];
  if (rotors.some(r => r.material !== rotor.material || r.size !== rotor.size)) {
   s.shaftPower = s.efficiency = 0;
   return stopOutput(m,'WAITING_INPUT','请使用同材料、同规格的转子');
  }
  const fuel = m.tanksIn.find(t => t && gasValue(t.f)), value = fuel ? gasValue(fuel.f) : 0;
  let target = 0;
  if (fuel) {
   const baseFlow = m.looseFit ? 2 * rotor.flow * Math.pow(1.05,(rotor.efficiency-.8)*20) : rotor.flow;
   const optimal = Math.max(1,Math.floor(16 * baseFlow / value));
   const weak = rotor.flow * rotor.efficiency < value;
   const amount = Math.min(I.sumFluid(m,fuel.f),weak?1:Math.floor(optimal*1.25));
   const drained = I.drain(m,[{f:fuel.f,mb:amount}]);
   if (drained) {
    m.tanksIn = drained;
    s.fuelUsed = (s.fuelUsed || 0) + amount;
    const ratio = 1 - Math.abs(amount - optimal) / optimal;
    target = weak ? Math.floor(rotor.flow * rotor.efficiency) :
     Math.floor(amount * value * ratio * fitEfficiency(rotor,.95,m.looseFit));
   }
  }
  const shaft = s.shaftPower || 0, difference = target-shaft;
  const change = Math.max(10,Math.floor(Math.abs(difference)/100));
  s.shaftPower = shaft + Math.sign(difference)*Math.min(change,Math.abs(difference));
  if (!s.shaftPower) {
   s.efficiency = 0;
   return stopOutput(m,'FUEL','缺少适用燃气');
  }
  s.runtime++;
  s.efficiency = Math.min(10000,s.efficiency+10);
  s.power = I.generate(m,s.shaftPower*s.efficiency/10000);
  if (s.runtime % 1000 === 0) wearRotors(assemblies,s.shaftPower);
  m.status = {code:'GENERATING',text:'发电中'};
  return true;
 }

 function chemicalFuel(f) {
  return fuelFamilies.find(family => I.fuelValue(family,f));
 }
 function chemicalCycle(m) {
  let family, fuel;
  for (const entry of fuelFamilies) {
   fuel = m.tanksIn.find(t => t && I.fuelValue(entry,t.f));
   if (fuel) {family=entry;break;}
  }
  if (!fuel) return null;
  const amount = I.sumFluid(m,fuel.f), additive = I.sumFluid(m,promoter);
  const efficiency = additive ? Math.floor(15000*Math.exp(-family.coefficient*amount/additive)) : 0;
  const raw = Math.floor(amount*I.fuelValue(family,fuel.f)*family.multiplier/period);
  return {drains:[{f:fuel.f,mb:amount},{f:promoter,mb:additive}],efficiency:efficiency,
   power:Math.floor(raw*efficiency/10000),fuel:amount};
 }
 function chemical(m) {
  if (!I.ready(m)) return false;
  const s = I.state(m), limit = I.outputLimit(m);
  if (!s.burnTicks) {
   const cycle = chemicalCycle(m);
   if (!cycle) return stopOutput(m,'FUEL','缺少燃料');
   m.tanksIn = I.drain(m,cycle.drains);
   s.fuelUsed = (s.fuelUsed || 0) + cycle.fuel;
   s.efficiency = cycle.efficiency;
   s.cyclePower = cycle.power;
   s.burnTicks = period;
  }
  if (s.cyclePower > limit && s.runtime >= startupTolerance) {
   s.burnTicks = s.runtime = 0;
   MACHINE_CONTROL.stop(m,{code:'AMPERAGE',text:'动力仓功率不足'});
   s.power=0;
   return true;
  }
  s.power = s.cyclePower <= limit ? I.generate(m,s.cyclePower) : 0;
  s.burnTicks--;
  s.runtime++;
  m.status = s.efficiency ? (s.cyclePower > limit ? {code:'AMPERAGE',text:'动力仓功率不足'} :
   {code:'GENERATING',text:'发电中'}) : {code:'FUEL',text:'缺少助燃剂'};
  return true;
 }
 const steamOutputs = ['ic2superheatedsteam','supercriticalsteam','densesupercriticalsteam'];
 let coolingFluids;
 function coldFluids() {
  if (!coolingFluids) coolingFluids = new Set(Array.from(heatRecipes().values(),fuel=>fuel.cold));
  return coolingFluids;
 }
 function exchangerOutputs(id) {return id===coldFace?[...coldFluids()]:steamOutputs;}
 function exchangerPortAccepts(id,f,direction) {
  if (direction==='input') return id===hotFace?heatRecipes().has(f):f===water;
  return id===coldFace?coldFluids().has(f):steamOutputs.includes(f);
 }
 function portTanks(m, role, id) {
  return MB.members(m,role).find(p => p.face === id).tanks;
 }
 function exchanger(m) {
  if (!I.ready(m)) return false;
  const s = I.state(m);
  let cycle = s.exchange;
  let hot, hotNext, cold;
  if (!cycle) {
   hot = portTanks(m,'tanksIn',hotFace);
   const tank = hot[0], fuel = tank && heatRecipes().get(tank.f);
   if (!fuel) return fail(m,'WAITING_INPUT','缺少热流体');
   const amount = Math.min(tank.mb,fuel.maximum);
   const circuit = MULTIBLOCKS.controllerCircuit(m);
   const steps = circuit.circuitConfigured && circuit.circ >= 1 ? circuit.circ - 1 : 0;
   const flow = Math.floor(fuel.steam * (1-.015*steps) * amount / (fuel.maximum * period));
   const steamAmount = Math.floor(flow/160)*160;
   if (!steamAmount) return fail(m,'WAITING_INPUT','热流体不足');
   cycle = {ticks:period,fluid:amount>=Math.max(1,fuel.threshold-150*steps)?fuel.high:fuel.regular,
    amount:Math.floor(steamAmount/fuel.unit),water:steamAmount/160};
   hotNext = TX.planDrain(hot,[{f:tank.f,mb:amount}]).tanks;
   cold = {f:fuel.cold,mb:amount};
  }
  const waterTanks = MB.members(m,'tanksIn').filter(p => p.face !== hotFace);
  const waterNext = TX.planDrain(waterTanks.flatMap(p => p.tanks),[{f:water,mb:cycle.water}]);
  if (!waterNext) return fail(m,'NO_WATER','缺少蒸馏水');
  const outputs = cycle.amount ? [{f:cycle.fluid,mb:cycle.amount}] : [];
  if (cold) outputs.push(cold);
  const plan = MB.fluidOutput(m,outputs,false);
  if (!plan) return fail(m,'FLUID_OUTPUT',cold?'蒸汽或冷却流体仓已满':'蒸汽输出仓已满');
  if (hotNext) hot[0] = hotNext[0];
  let index = 0;
  for (const p of waterTanks) for (let i=0; i<p.tanks.length; i++) p.tanks[i] = waterNext.tanks[index++];
  MB.commitFluidOutput(m,plan);
  cycle.ticks--;
  s.exchange = cycle.ticks ? cycle : null;
  s.steamFluid = cycle.fluid;
  s.flow = cycle.amount;
  m.status = {code:'BOILING',text:'产汽中'};
  return true;
 }
 function pump(m) {
  if (!I.ready(m)) return false;
  const mode = pumpModes[m.processingMode || 0], cost = 480;
  if (m.eu < cost) return fail(m,'ENERGY','电量不足');
  const fluids = I.drain(m,[{f:mode.input,mb:mode.inputAmount}]);
  if (!fluids) return fail(m,mode.input===water?'NO_WATER':'WAITING_INPUT',
   mode.input===water?'缺少蒸馏水':'缺少冷却液');
  const plan = MB.fluidOutput(m,[{f:mode.output,mb:mode.outputAmount}],false);
  if (!plan) return fail(m,'FLUID_OUTPUT','流体输出仓已满');
  m.tanksIn = fluids;
  MB.commitFluidOutput(m,plan);
  m.eu -= cost;
  m.energySpent = (m.energySpent || 0) + cost;
  I.state(m).flow = mode.outputAmount;
  m.status = {code:'RUNNING',text:mode.name==='直接产汽'?'产汽中':'加热冷却液'};
  return true;
 }

 ENGINE.registerBehavior('xl_gas_turbine',{
  ensure:I.state,tick:gas,acceptsFluid:(m,f)=>gasValue(f)>0,
  acceptsItem:(m,k)=>rotorFits({k:k}),idleTick:m=>{const s=I.state(m);s.power=s.shaftPower=s.efficiency=0;}
 });
 ENGINE.registerBehavior('universal_chemical_engine',{
  ensure:I.state,tick:chemical,acceptsFluid:(m,f)=>f===promoter||!!chemicalFuel(f),
  idleTick:m=>{const s=I.state(m);s.power=s.runtime=0;}
 });
 ENGINE.registerBehavior('extreme_heat_exchanger',{
  ensure:I.state,tick:exchanger,acceptsFluid:(m,f)=>f===water||heatRecipes().has(f)
 });
 ENGINE.registerBehavior('deep_earth_pump',{
  ensure:I.state,tick:pump,acceptsFluid:(m,f)=>pumpModes.some(mode=>mode.input===f)
 });
 AUX_INVENTORIES.register('xlTurbineRotor',{accepts:rotorFits,capacity:()=>1});
 window.LUV_GENERATION = {hotFace,coldFace,exchangerOutputs,exchangerPortAccepts,pumpModes,rotorCount,heatMap};
})();
