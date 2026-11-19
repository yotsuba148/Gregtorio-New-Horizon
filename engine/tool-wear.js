/* 工具耐久策略：放置版不消耗耐久，保留原接口便于以后调整。 */
(function(root){
 'use strict';
 var WEAR_ENABLED = false;
 function preserved(state){return !WEAR_ENABLED || DEVELOPER_MODE.preserveTools(state);}
 function amount(state,normal){return preserved(state)?0:normal;}
 // 只给逻辑测试用：模拟原本会磨损的行为
 function setEnabled(on){WEAR_ENABLED=!!on;}
 root.TOOL_WEAR={preserved:preserved,amount:amount,setEnabled:setEnabled};
})(typeof window!=='undefined'?window:globalThis);
