/* Shared hatch roles. Machine profiles own admission and structure requirements. */
(function(root){
 'use strict';
 function roles(spec){return spec.hatchRoles||[spec.type];}
 function has(spec,role){return roles(spec).includes(role);}
 function allows(spec,check){
  if(!spec.hatchRoles)return check(spec);
  return roles(spec).every(function(role){
   var view=Object.assign({},spec,{type:role});
   ['itemIn','itemOut','fluidIn','fluidOut'].forEach(function(k){view[k]=k===role;});
   return check(view);
  });
 }
 var names={energy:'能源仓',dynamo:'动力仓',itemIn:'输入总线',itemOut:'输出总线',
  fluidIn:'输入仓',fluidOut:'输出仓',steam:'蒸汽仓',data:'数据访问仓',dataOut:'数据库主接口',
  laserSource:'激光源仓',neutronAccelerator:'中子加速器',neutronSensor:'中子传感器',
  catalyst:'催化剂仓',milling:'研磨球仓',radiation:'放射仓',outputAssembly:'输出总成'};
 var ordinary=['energy','itemIn','itemOut','fluidIn','fluidOut'];
 function isOrdinary(s){return ordinary.includes(s.type);}
 function takesPower(s){return s.type==='energy'||s.powerInput===true;}
 function label(s,itemName){
  if(s.type==='feedthrough')return s.diode?'线缆二极管':'机器外壳';
  if(s.steamComponent&&(s.type==='itemIn'||s.type==='itemOut'))return names[s.type]+'(蒸汽)';
  if(s.dataReceiver||s.dual)return itemName;
  return names[s.type]||itemName;
 }
 function check(ports,requirements,errors){
  var specs=ports.map(function(p){return MULTIBLOCKS.spec(p.k);});
  Object.keys(requirements).forEach(function(role){
   var rule=requirements[role],min=typeof rule==='number'?rule:rule.min||0;
   var label=rule.label||names[role],count=specs.filter(function(s){return s&&has(s,role)&&(!rule.matches||rule.matches(s));}).length;
   if(count<min)errors.push('缺少'+label+(min-count>1?' ×'+(min-count):''));
   if(rule.max!=null&&count>rule.max)errors.push(label+'多装了 '+(count-rule.max)+' 个');
  });
 }
 root.HATCH_RULES={roles:roles,has:has,allows:allows,check:check,label:label,isOrdinary:isOrdinary,takesPower:takesPower};
})(typeof window!=='undefined'?window:globalThis);
