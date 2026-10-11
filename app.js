const $ = (id) => document.getElementById(id);
const views = ["home","chat","story","image","voice","writer","code","game","projects"];
const labels = {home:"Dashboard",chat:"AI Chat",story:"Story to Video",image:"Image Studio",voice:"Voice Studio",writer:"Story Writer",code:"Code Studio",game:"Game Creator",projects:"My Projects"};
function navigate(view){
  if(!views.includes(view)) return;
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active-view"));
  $("view-"+view).classList.add("active-view");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  $("pageName").textContent=labels[view]||view;
  $("sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
  if(view==="projects") renderProjects();
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
$("menuButton").addEventListener("click",()=>$("sidebar").classList.toggle("open"));

function setOutput(id,title,text){
  const box=$(id); box.innerHTML="";
  const label=document.createElement("span"); label.className="output-label"; label.textContent=title;
  const p=document.createElement("p"); p.textContent=text;
  box.append(label,p);
  const actions=document.createElement("div"); actions.className="row-actions";
  const copy=document.createElement("button"); copy.className="secondary-button"; copy.textContent="Copy text";
  copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(text);copy.textContent="Copied ✓"}catch(e){copy.textContent="Select and copy text"}});
  const save=document.createElement("button"); save.className="secondary-button"; save.textContent="Save project";
  save.addEventListener("click",()=>{saveProject(title,text);save.textContent="Saved ✓"});
  actions.append(copy,save); box.append(actions);
}
function saveProject(title,content){
  const items=JSON.parse(localStorage.getItem("dakx_projects")||"[]");
  items.unshift({title,content,date:new Date().toLocaleString()});
  localStorage.setItem("dakx_projects",JSON.stringify(items.slice(0,100)));
}
function renderProjects(){
  const list=$("projectList"),items=JSON.parse(localStorage.getItem("dakx_projects")||"[]");
  list.innerHTML="";
  if(!items.length){list.innerHTML='<p class="muted">No saved projects yet. Generate a draft and save it.</p>';return}
  items.forEach(item=>{const card=document.createElement("div");card.className="project-item";const h=document.createElement("strong");h.textContent=item.title;const small=document.createElement("small");small.textContent=item.date;const p=document.createElement("p");p.textContent=item.content;const copy=document.createElement("button");copy.className="secondary-button";copy.textContent="Copy";copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(item.content);copy.textContent="Copied ✓"}catch(e){copy.textContent="Copy unavailable"}});card.append(h,document.createElement("br"),small,p,copy);list.append(card)});
}
$("clearProjects").addEventListener("click",()=>{if(confirm("Delete all saved drafts on this device?")){localStorage.removeItem("dakx_projects");renderProjects()}});

$("chatSend").addEventListener("click",()=>{
 const q=$("chatInput").value.trim(); if(!q){alert("Please enter a question or idea first.");return}
 setOutput("chatOutput","DRAFT RESPONSE",`Here is a structured starting point based on your request:\n\n${q}\n\nSuggested next steps:\n1. Clarify the goal and audience.\n2. Break the task into smaller steps.\n3. Check the result and improve it.\n\nNote: DAKX AI is currently in starter/demo mode. Connect a secure AI backend to receive real AI-generated answers.`);
});
$("storyGenerate").addEventListener("click",()=>{
 const story=$("storyInput").value.trim();if(!story){alert("Please paste your story first.");return}
 const style=$("storyStyle").value,duration=$("storyDuration").value;
 const chunks=story.split(/(?<=[.!?।])\s+/).filter(Boolean);const count=Math.min(8,Math.max(3,chunks.length));
 let out=`PROJECT: Story to Video\nSTYLE: ${style}\nTARGET DURATION: ${duration}\n\n`;
 for(let i=0;i<count;i++){const line=chunks[Math.min(i,chunks.length-1)];out+=`SCENE ${i+1}\nStory beat: ${line}\nVisual prompt: ${style}, cinematic composition, clear subject, expressive action, detailed environment, coherent lighting, smooth camera movement, high-quality textures. Preserve character appearance and color grading across scenes.\nAudio: atmospheric background music; narration aligned with this story beat.\nTransition: smooth cinematic cut.\n\n`}
 out+="VOICE-OVER SOURCE STORY\n"+story+"\n\nNote: This creates a scene outline and prompts only. It does not render video files.";
 setOutput("storyOutput","SCENE OUTLINE",out);
});
$("imageGenerate").addEventListener("click",()=>{
 const q=$("imageInput").value.trim();if(!q){alert("Describe the image first.");return}
 setOutput("imageOutput","ENHANCED IMAGE PROMPT",`${q}. Professional composition, intentional focal point, realistic lighting and shadows, rich but natural colors, detailed textures, clear subject separation, high resolution, coherent perspective, polished visual storytelling. Avoid distorted anatomy, extra fingers, unreadable text, watermarks and accidental artifacts.\n\nTip: Choose an image generation service to render this prompt into an image.`);
});
$("speakButton").addEventListener("click",()=>{
 const text=$("voiceInput").value.trim();if(!text){alert("Enter narration text first.");return}
 if(!("speechSynthesis" in window)){alert("Speech playback is not supported in this browser.");return}
 window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=$("voiceLanguage").value;u.rate=Number($("voiceRate").value);window.speechSynthesis.speak(u);
});
$("writerGenerate").addEventListener("click",()=>{
 const idea=$("writerInput").value.trim();if(!idea){alert("Enter a story idea first.");return}
 const genre=$("writerGenre").value,len=$("writerLength").value;
 setOutput("writerOutput","STORY DRAFT",`TITLE: ${idea.split(/[.!?]/)[0].slice(0,60)}\nGENRE: ${genre}\n\nOPENING\nIntroduce the main character and the world around them. Show what they want and what makes the situation interesting.\n\nTHE JOURNEY\n${idea}\n\nTHE TURNING POINT\nA surprising obstacle forces the main character to make a difficult choice. Their courage, creativity or kindness changes the direction of the story.\n\nENDING\nResolve the central problem and show how the character has changed. End with a memorable image or meaningful line.\n\nEXPANSION NOTE: ${len} story selected. This is a story structure starter; connect an AI model for a fully written original story.`);
});
$("codeGenerate").addEventListener("click",()=>{
 const q=$("codeInput").value.trim();if(!q){alert("Describe what you want to build first.");return}
 setOutput("codeOutput","DEVELOPMENT BRIEF",`PROJECT REQUEST\n${q}\n\nRECOMMENDED WORKFLOW\n1. Confirm the main user journey and required screens.\n2. Choose a suitable stack and project structure.\n3. Build the smallest working feature first.\n4. Test on a mobile viewport and handle errors.\n5. Protect secrets on the server; never expose private API keys in browser code.\n6. Deploy a preview and verify it before release.\n\nNote: This is a planning brief, not executable generated code. Connect a secure AI backend for live code generation.`);
});
$("gameGenerate").addEventListener("click",()=>{
 const q=$("gameInput").value.trim();if(!q){alert("Describe your game idea first.");return}
 setOutput("gameOutput","GAME PLAN",`CONCEPT\n${q}\n\nTYPE: ${$("gameType").value}\nTARGET PLATFORM: ${$("gamePlatform").value}\n\nCORE LOOP\n1. Enter a level or challenge.\n2. Complete the objective using the main mechanic.\n3. Earn a reward or unlock.\n4. Upgrade and move to a harder challenge.\n\nFIRST BUILD\nCreate a small prototype with one playable area, clear controls, one objective, feedback for success/failure and a restart button.\n\nNEXT: Define controls, camera, art style, assets, performance target and save system. This is a planning outline, not a playable game build.`);
});
if("serviceWorker" in navigator && location.protocol.startsWith("http")){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}))}
