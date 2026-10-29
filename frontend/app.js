// Set this to your deployed Render API URL after deployment.
const API_BASE = "http://localhost:8000";
const boardEl = document.getElementById("board");
const timerEl = document.getElementById("timer");
const messageEl = document.getElementById("message");
let gameId = null, puzzle = [], board = [], selected = null, difficulty = "leicht";
let seconds = 0, timerHandle = null, started = false, finished = false;

function setMessage(text, type="") { messageEl.textContent = text; messageEl.className = "message " + type; }
function formatTime(n) { return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`; }
function startClock() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = setInterval(() => { if(started && !finished) { seconds++; timerEl.textContent = formatTime(seconds); } }, 1000);
}
async function newGame() {
  finished = true; started = false; selected = null; seconds = 0; timerEl.textContent = "00:00";
  setMessage("Ein neues Sudoku wird vorbereitet …");
  document.getElementById("newBtn").disabled = true;
  try {
    const response = await fetch(`${API_BASE}/api/new?difficulty=${difficulty}`, {method:"POST"});
    if(!response.ok) throw new Error("API antwortet nicht");
    const data = await response.json();
    gameId = data.game_id; puzzle = data.board.map(row => row.slice()); board = data.board.map(row => row.slice());
    finished = false; started = true; renderBoard(); setMessage("Wähle ein Feld und trage eine Zahl ein."); startClock();
  } catch(e) {
    setMessage("Verbindung zum Python-Backend fehlgeschlagen. Prüfe API_BASE und starte das Backend.", "error");
  } finally { document.getElementById("newBtn").disabled = false; }
}
function renderBoard() {
  boardEl.innerHTML = "";
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    const btn = document.createElement("button"); btn.className = "cell"; btn.type = "button";
    btn.setAttribute("role","gridcell"); btn.setAttribute("aria-label",`Zeile ${r+1}, Spalte ${c+1}`);
    btn.dataset.r=r; btn.dataset.c=c; btn.textContent = board[r][c] || "";
    if(puzzle[r][c]) btn.classList.add("given");
    btn.addEventListener("click",()=>{ selected=[r,c]; renderBoard(); });
    boardEl.appendChild(btn);
  }
  highlight();
}
function highlight() {
  if(!selected) return;
  const [sr,sc]=selected, val=board[sr][sc];
  [...boardEl.children].forEach((el,i)=>{
    const r=Math.floor(i/9),c=i%9;
    if(r===sr||c===sc||(Math.floor(r/3)===Math.floor(sr/3)&&Math.floor(c/3)===Math.floor(sc/3))) el.classList.add("peer");
    if(r===sr&&c===sc) el.classList.add("selected");
    if(val&&board[r][c]===val) el.classList.add("same");
  });
}
function enterNumber(n) {
  if(!selected||finished) return;
  const [r,c]=selected; if(puzzle[r][c]) return;
  board[r][c]=n; renderBoard();
  if(n) setMessage("Zahl eingetragen. Du kannst deine Eingaben jederzeit prüfen.");
}
document.querySelectorAll("[data-number]").forEach(btn=>btn.addEventListener("click",()=>enterNumber(Number(btn.dataset.number))));
document.addEventListener("keydown",e=>{
  if(e.key>="1"&&e.key<="9") enterNumber(Number(e.key));
  else if(e.key==="Backspace"||e.key==="Delete"||e.key==="0") enterNumber(0);
  else if(selected&&["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){
    e.preventDefault();let [r,c]=selected;
    if(e.key==="ArrowUp")r=Math.max(0,r-1);if(e.key==="ArrowDown")r=Math.min(8,r+1);
    if(e.key==="ArrowLeft")c=Math.max(0,c-1);if(e.key==="ArrowRight")c=Math.min(8,c+1);
    selected=[r,c];renderBoard();
  }
});
document.getElementById("checkBtn").addEventListener("click",async()=>{
  if(!gameId||finished)return;
  try {
    const response=await fetch(`${API_BASE}/api/check`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({game_id:gameId,board})});
    const data=await response.json(); if(!response.ok) throw new Error(data.detail||"Prüfung fehlgeschlagen");
    [...boardEl.children].forEach(el=>el.classList.remove("error"));
    data.wrong_cells.forEach(([r,c])=>boardEl.children[r*9+c].classList.add("error"));
    if(data.solved){finished=true;started=false;clearInterval(timerHandle);setMessage(`Perfekt gelöst! Deine Zeit: ${formatTime(seconds)} 🎉`,"success");}
    else if(data.wrong_cells.length){setMessage(`${data.wrong_cells.length} falsche ${data.wrong_cells.length===1?"Eingabe":"Eingaben"} markiert. Schau noch einmal genau hin.`,"error");}
    else setMessage(`Bis hierhin ist alles richtig! Noch ${data.empty_cells} ${data.empty_cells===1?"Feld":"Felder"} offen.`,"success");
  } catch(e){setMessage(e.message,"error");}
});
document.getElementById("newBtn").addEventListener("click",newGame);
document.querySelectorAll(".level").forEach(btn=>btn.addEventListener("click",()=>{
  difficulty=btn.dataset.level;document.querySelectorAll(".level").forEach(b=>b.classList.toggle("active",b===btn));newGame();
}));
newGame();
