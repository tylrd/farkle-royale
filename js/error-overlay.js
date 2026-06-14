/* Crash overlay — installed before everything else so it can surface even a parse
   error or an early failure as a visible red box. Deliberately ES5 / dependency-free. */
/* Installed BEFORE the main script so it can report a parse error or an early failure as a visible box. */
(function(){
  function box(msg){ try{
    var b=document.getElementById("fatal");
    if(!b){ b=document.createElement("div"); b.id="fatal";
      b.style.cssText="position:fixed;left:0;right:0;top:0;z-index:99999;margin:10px;padding:14px;border:2px solid #ff3b3b;border-radius:10px;background:#1a0410;color:#ffd0dd;font:14px/1.45 monospace;white-space:pre-wrap";
      (document.body||document.documentElement).appendChild(b); }
    b.textContent="\u26A0 "+msg;
  }catch(e){} }
  window.addEventListener("error",function(e){ box((e&&e.message?e.message:"script error")+(e&&e.lineno?(" (line "+e.lineno+")"):"")); });
  window.addEventListener("unhandledrejection",function(e){ var r=e&&e.reason; box("startup: "+((r&&r.message)?r.message:r)); });
})();
