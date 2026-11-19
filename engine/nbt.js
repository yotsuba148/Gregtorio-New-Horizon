/* Read the exporter's SNBT strings as data, including 1.7.10 indexed lists. */
(function(root){
 'use strict';
 function parse(source){
  if(source&&typeof source==='object')return source;
  var s=String(source),at=0,depth=0;
  function space(){while(/\s/.test(s[at]||'!'))at++;}
  function fail(){throw Error('Invalid SNBT at '+at);}
  function quoted(){var q=s[at++],v='';while(at<s.length){var c=s[at++];if(c===q)return v;if(c==='\\'){if(at>=s.length)fail();c=s[at++];}v+=c;}fail();}
  function token(key){space();if(s[at]==='"'||s[at]==="'")return quoted();var start=at;while(at<s.length&&!/[\s,}\]]/.test(s[at])&&(!key||s[at]!==':'))at++;if(start===at)fail();return s.slice(start,at);}
  function value(){space();if(++depth>128)fail();var c=s[at],v;
   if(c==='{'){at++;v=Object.create(null);space();while(s[at]!=='}'){var k=token(true);space();if(s[at++]!==':')fail();v[k]=value();space();if(s[at]===','){at++;space();if(s[at]==='}')break;}else if(s[at]!=='}')fail();}at++;}
   else if(c==='['){at++;v=[];space();if(/^[BIL];/i.test(s.slice(at,at+2)))at+=2;
    while(s[at]!==']'){space();var index=/^\d+\s*:/.exec(s.slice(at));if(index)at+=index[0].length;v.push(value());space();if(s[at]===','){at++;space();if(s[at]===']')break;}else if(s[at]!==']')fail();}at++;}
   else if(c==='"'||c==="'")v=quoted();
   else{v=token(false);if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?[bslfd]?$/i.test(v)){var n=Number(v.replace(/[bslfd]$/i,''));if(!Number.isFinite(n))fail();v=n;}}
   depth--;return v;
  }
  var result=value();space();if(at!==s.length)fail();return result;
 }
 function tryParse(source){try{return parse(source);}catch(e){return null;}}
 root.SNBT={parse:parse,tryParse:tryParse};
 if(typeof module==='object'&&module.exports)module.exports=root.SNBT;
})(typeof window!=='undefined'?window:globalThis);
