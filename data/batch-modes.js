(function(root){
 'use strict';
 // GT5U 5.09.51.482 supportsBatchMode declarations, including GTPP inheritance.
 // MTESteamMultiBase overrides the GTPP declaration with false.
 var machines={};
 [1000,1001,1002,1126,1169,1159,1160,859,840,3010,360,790,797,850,792,687,992,3011,998,12735].forEach(function(id){machines['gregtech:gt.blockmachines@'+id]={strategy:'parallel_helper',maxSize:128};});
 [1170,1003].forEach(function(id){machines['gregtech:gt.blockmachines@'+id]={strategy:'fractional_window',maxSize:128};});
 root.GD.batchModes={defaultEnabled:true,machines:machines};
})(typeof window!=='undefined'?window:globalThis);
