/* Keyboard navigation owns the focus ring; modifier keys do not change input mode. */
(function(root){
 'use strict';
 var doc=root.document;if(!doc||!doc.documentElement)return;
 var html=doc.documentElement;
 function mode(value){if(html.dataset.focusInput!==value)html.dataset.focusInput=value;}
 mode('pointer');
 doc.addEventListener('pointerdown',function(){mode('pointer');},true);
 doc.addEventListener('keydown',function(e){if(e.key==='Tab')mode('keyboard');},true);
})(typeof window!=='undefined'?window:globalThis);
