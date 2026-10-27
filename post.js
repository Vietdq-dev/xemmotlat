(function(){
  var $=function(id){return document.getElementById(id)};
  // Demo creator_info (in production this comes from POST /v2/post/publish/creator_info/query/ via the owner's backend)
  var creator={nickname:"Xem Một Lát",username:"xemmotlat",privacy_level_options:["PUBLIC_TO_EVERYONE","MUTUAL_FOLLOW_FRIENDS","SELF_ONLY"],
    comment_disabled:false,duet_disabled:false,stitch_disabled:false,max_video_post_duration_sec:600,can_post:true};
  $("nickname").textContent=creator.nickname;$("username").textContent="@"+creator.username;$("maxDur").textContent=creator.max_video_post_duration_sec;
  // Only show privacy options returned by creator_info
  Array.prototype.slice.call($("privacy").options).forEach(function(o){if(o.value&&creator.privacy_level_options.indexOf(o.value)<0)o.remove();});
  [["allowComment","comment_disabled"],["allowDuet","duet_disabled"],["allowStitch","stitch_disabled"]].forEach(function(p){
    if(creator[p[1]]){$(p[0]).disabled=true;$(p[0]).checked=false;$(p[0]).parentNode.style.opacity=.45;}});
  if(!creator.can_post){$("capMsg").hidden=false;}

  var videoOk=false;
  $("video").addEventListener("change",function(){
    var f=this.files[0],v=$("preview");videoOk=false;$("durMsg").textContent="";
    if(!f){v.hidden=true;update();return;}
    v.src=URL.createObjectURL(f);v.hidden=false;
    v.onloadedmetadata=function(){
      if(v.duration>creator.max_video_post_duration_sec){$("durMsg").textContent="This video is "+Math.round(v.duration)+"s; the maximum for this account is "+creator.max_video_post_duration_sec+"s.";}
      else videoOk=true;update();};
    v.onerror=function(){$("durMsg").textContent="Could not read this video file.";update();};
  });

  ["privacy","commercial","yourBrand","branded","title"].forEach(function(id){$(id).addEventListener(id==="title"?"input":"change",update);});

  function update(){
    var com=$("commercial").checked,yb=$("yourBrand").checked,br=$("branded").checked,priv=$("privacy").value;
    $("commercialOpts").hidden=!com;
    if(!com){$("yourBrand").checked=false;$("branded").checked=false;yb=br=false;}
    // Branded content cannot be private
    var self=$("optSelf");
    if(self){
      if(br){self.disabled=true;self.title="Branded content visibility cannot be set to private.";}
      else{self.disabled=false;self.title="";}
    }
    if(priv==="SELF_ONLY"){$("branded").disabled=true;$("brandedLabel").title="Branded content visibility can't be private.";$("brandedLabel").style.opacity=.5;
      $("privNote").textContent=com?"Branded content visibility can't be private, so \"Branded content\" is disabled while \"Only me\" is selected.":"";}
    else{$("branded").disabled=false;$("brandedLabel").title="";$("brandedLabel").style.opacity=1;$("privNote").textContent=br?"Branded content visibility cannot be set to private.":"";}
    // Label prompt
    $("labelMsg").textContent=br?"Your video will be labeled as 'Paid partnership'":(yb?"Your video will be labeled as 'Promotional content'":"");
    // Consent line
    var mu='<a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noopener">Music Usage Confirmation</a>';
    $("consent").innerHTML=br?'By posting, you agree to TikTok\'s <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noopener">Branded Content Policy</a> and '+mu+'.':'By posting, you agree to TikTok\'s '+mu+'.';
    // Post button
    var reason="";
    if(!creator.can_post)reason="This account can't make more posts right now. Please try again later.";
    else if(!videoOk)reason="Select a video first.";
    else if(!priv)reason="Choose who can view this video.";
    else if(com&&!yb&&!br)reason="You need to indicate if your content promotes yourself, a third party, or both.";
    $("postBtn").disabled=!!reason;$("postWrap").title=reason;
  }
  update();

  $("postBtn").addEventListener("click",function(){
    if(this.disabled)return;
    var s=$("status"),btn=this;btn.disabled=true;
    var payload={post_info:{title:$("title").value,privacy_level:$("privacy").value,disable_comment:!$("allowComment").checked,
      disable_duet:!$("allowDuet").checked,disable_stitch:!$("allowStitch").checked,brand_content_toggle:$("branded").checked,
      brand_organic_toggle:$("yourBrand").checked,is_aigc:$("aigc").checked},source_info:{source:"FILE_UPLOAD"}};
    var steps=["Uploading…","Processing…"];s.textContent="";
    steps.forEach(function(t,i){setTimeout(function(){s.textContent+=t+"\n";},i*900);});
    setTimeout(function(){
      s.textContent+="Request queued for the owner's backend (static demo – this page does not call TikTok).\n"+
        "Prepared post settings: "+JSON.stringify(payload.post_info)+"\n"+
        "When the owner's backend publishes it, the status is checked via publish/status/fetch. It may take a few minutes to appear — check your TikTok inbox/profile.";
      btn.disabled=false;
    },steps.length*900);
  });
})();
