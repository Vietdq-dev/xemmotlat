(function(){
var BACKEND_URL="https://mega-walnut-organizations-candles.trycloudflare.com";
var MAX_BYTES=95*1024*1024;
var $=function(id){return document.getElementById(id)};
var SS=window.sessionStorage;
var creator=null,videoOk=false,busy=false;
var LABELS={PUBLIC_TO_EVERYONE:"Public (Everyone)",MUTUAL_FOLLOW_FRIENDS:"Friends",FOLLOWER_OF_CREATOR:"Followers",SELF_ONLY:"Only me"};

function api(path,body){
  return fetch(BACKEND_URL+path,{method:"POST",headers:{"Content-Type":"application/json","X-Session":SS.getItem("xml_sid")||""},body:JSON.stringify(body||{})})
    .then(function(r){return r.json().catch(function(){return {ok:false,error:"HTTP "+r.status}}).then(function(j){if(r.status===401){logout(true);}return j;});})
    .catch(function(){return {ok:false,error:"Cannot reach the posting backend. It may be offline."};});
}
function say(t){$("authMsg").textContent=t;}
function logout(silent){SS.removeItem("xml_sid");creator=null;$("step2").hidden=true;$("logoutBtn").hidden=true;$("loginBtn").hidden=false;if(!silent)say("Logged out.");}

$("loginBtn").addEventListener("click",function(){
  this.disabled=true;say("Opening TikTok login…");var b=this;
  api("/auth/start").then(function(j){
    if(!j.ok){say("Login could not start: "+j.error);b.disabled=false;return;}
    SS.setItem("xml_state",j.state);location.href=j.url;});
});
$("logoutBtn").addEventListener("click",function(){api("/auth/logout").then(function(){logout(false);});});

function loadCreator(){
  say("Loading your TikTok creator info…");
  api("/creator_info").then(function(j){
    if(!j.ok){say(j.error);return;}
    creator=j.data;$("loginBtn").hidden=true;$("logoutBtn").hidden=false;say("Connected to TikTok.");
    $("avatar").src=creator.creator_avatar_url||"";$("nickname").textContent=creator.creator_nickname||"";
    $("username").textContent=creator.creator_username?"@"+creator.creator_username:"";
    $("maxDur").textContent=creator.max_video_post_duration_sec;
    var sel=$("privacy");while(sel.options.length>1)sel.remove(1);sel.value="";
    (creator.privacy_level_options||[]).forEach(function(v){var o=document.createElement("option");o.value=v;o.textContent=LABELS[v]||v;if(v==="SELF_ONLY")o.id="optSelf";sel.appendChild(o);});
    [["allowComment","comment_disabled"],["allowDuet","duet_disabled"],["allowStitch","stitch_disabled"]].forEach(function(p){
      var dis=!!creator[p[1]];$(p[0]).disabled=dis;if(dis)$(p[0]).checked=false;$(p[0]).parentNode.style.opacity=dis?.45:1;
      $(p[0]).parentNode.title=dis?"Turned off in your TikTok privacy settings.":"";});
    $("capMsg").hidden=creator.can_post!==false;
    $("step2").hidden=false;update();
  });
}

// OAuth return: callback.html forwards ?code=&state= here
(function(){
  var p=new URLSearchParams(location.search);
  if(p.get("code")||p.get("auth_error")){history.replaceState(null,"",location.pathname);}
  if(p.get("auth_error")){say("TikTok login was cancelled or failed: "+p.get("auth_error"));return;}
  if(p.get("code")){
    var st=p.get("state")||"",exp=SS.getItem("xml_state");SS.removeItem("xml_state");
    if(!exp||st!==exp){say("Login check failed (state mismatch). Please press Login with TikTok again.");return;}
    say("Finishing TikTok login…");
    api("/auth/exchange",{code:p.get("code"),state:st}).then(function(j){
      if(!j.ok){say(j.error);return;}
      SS.setItem("xml_sid",j.session);
      if(j.missing_scopes&&j.missing_scopes.length)say("Missing permissions: "+j.missing_scopes.join(", ")+". Please log in again and allow all.");
      loadCreator();});
    return;
  }
  if(SS.getItem("xml_sid"))loadCreator();
})();

$("video").addEventListener("change",function(){
  var f=this.files[0],v=$("preview");videoOk=false;$("durMsg").textContent="";
  if(!f){v.hidden=true;update();return;}
  if(f.size>MAX_BYTES){$("durMsg").textContent="This file is "+Math.round(f.size/1048576)+" MB; the maximum is 95 MB.";v.hidden=true;update();return;}
  v.src=URL.createObjectURL(f);v.hidden=false;
  v.onloadedmetadata=function(){
    var max=creator?creator.max_video_post_duration_sec:0;
    if(max&&v.duration>max){$("durMsg").textContent="This video is "+Math.round(v.duration)+"s; the maximum for this account is "+max+"s.";}
    else videoOk=true;update();};
  v.onerror=function(){$("durMsg").textContent="Could not read this video file.";update();};
});

["privacy","commercial","yourBrand","branded","title"].forEach(function(id){$(id).addEventListener(id==="title"?"input":"change",update);});

function update(){
  var com=$("commercial").checked,yb=$("yourBrand").checked,br=$("branded").checked,priv=$("privacy").value;
  $("commercialOpts").hidden=!com;
  if(!com){$("yourBrand").checked=false;$("branded").checked=false;yb=br=false;}
  var self=$("optSelf");
  if(self){if(br){self.disabled=true;self.title="Branded content visibility cannot be set to private.";}else{self.disabled=false;self.title="";}}
  if(priv==="SELF_ONLY"){$("branded").disabled=true;$("brandedLabel").title="Branded content visibility can't be private.";$("brandedLabel").style.opacity=.5;
    $("privNote").textContent=com?"Branded content visibility can't be private, so \"Branded content\" is disabled while \"Only me\" is selected.":"";}
  else{$("branded").disabled=false;$("brandedLabel").title="";$("brandedLabel").style.opacity=1;$("privNote").textContent=br?"Branded content visibility cannot be set to private.":"";}
  $("labelMsg").textContent=br?"Your video will be labeled as 'Paid partnership'":(yb?"Your video will be labeled as 'Promotional content'":"");
  var mu='<a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noopener">Music Usage Confirmation</a>';
  $("consent").innerHTML=br?'By posting, you agree to TikTok\'s <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noopener">Branded Content Policy</a> and '+mu+'.':'By posting, you agree to TikTok\'s '+mu+'.';
  var reason="";
  if(!creator)reason="Log in with TikTok first.";
  else if(creator.can_post===false)reason="This account can't make more posts right now. Please try again later.";
  else if(busy)reason="Posting in progress…";
  else if(!videoOk)reason="Select a video first.";
  else if(!priv)reason="Choose who can view this video.";
  else if(com&&!yb&&!br)reason="You need to indicate if your content promotes yourself, a third party, or both.";
  $("postBtn").disabled=!!reason;$("postWrap").title=reason;
}
update();

function b64(s){return btoa(unescape(encodeURIComponent(s)));}
var STATUS_TEXT={PROCESSING_UPLOAD:"TikTok is receiving the upload…",PROCESSING_DOWNLOAD:"TikTok is processing the video…",
  SEND_TO_USER_INBOX:"Sent to your TikTok inbox.",PUBLISH_COMPLETE:"Published on TikTok.",FAILED:"TikTok reported the post failed."};

$("postBtn").addEventListener("click",function(){
  if(this.disabled)return;
  var s=$("status"),f=$("video").files[0];busy=true;update();
  var meta={title:$("title").value,privacy_level:$("privacy").value,disable_comment:!$("allowComment").checked,
    disable_duet:!$("allowDuet").checked,disable_stitch:!$("allowStitch").checked,brand_content_toggle:$("branded").checked,
    brand_organic_toggle:$("yourBrand").checked,is_aigc:$("aigc").checked};
  s.textContent="Uploading video to the posting backend… 0%";
  var x=new XMLHttpRequest();x.open("POST",BACKEND_URL+"/publish");
  x.setRequestHeader("Content-Type","application/octet-stream");
  x.setRequestHeader("X-Session",SS.getItem("xml_sid")||"");x.setRequestHeader("X-Post-Info",b64(JSON.stringify(meta)));
  x.upload.onprogress=function(e){if(e.lengthComputable)s.textContent="Uploading video to the posting backend… "+Math.round(e.loaded*100/e.total)+"%";};
  function done(msg){s.textContent+="\n"+msg;busy=false;update();}
  x.onerror=function(){done("Upload failed: cannot reach the posting backend.");};
  x.onload=function(){
    var j;try{j=JSON.parse(x.responseText);}catch(e){j={ok:false,error:"HTTP "+x.status};}
    if(x.status===401)logout(true);
    if(!j.ok){done("Error: "+j.error);return;}
    s.textContent="Upload received. TikTok accepted the post request (publish_id "+j.publish_id+", privacy "+(LABELS[j.privacy_level]||j.privacy_level)+").\nSending the file to TikTok…";
    poll(j.publish_id,0,"");
  };
  x.send(f);
  function poll(pid,n,last){
    if(n>200){done("Still processing. It may take a few minutes for your video to appear on your TikTok profile.");return;}
    setTimeout(function(){api("/status",{publish_id:pid}).then(function(j){
      if(!j.ok){done("Status error: "+j.error);return;}
      if(j.upload==="failed"){done(j.upload_error||"Upload to TikTok failed.");return;}
      if(j.upload==="uploading"){poll(pid,n+1,last);return;}
      if(j.tiktok_error){done("TikTok status error: "+j.tiktok_error);return;}
      var d=j.data||{},st=d.status||"",line=STATUS_TEXT[st]||st;
      if(st&&st!==last)s.textContent+="\n"+line+(st==="FAILED"&&d.fail_reason?" Reason: "+d.fail_reason:"");
      if(st==="PUBLISH_COMPLETE"||st==="FAILED"||st==="SEND_TO_USER_INBOX"){done(st==="FAILED"?"":"It may take a few minutes for your video to appear on your TikTok profile.");return;}
      poll(pid,n+1,st);});},3000);
  }
});
})();
