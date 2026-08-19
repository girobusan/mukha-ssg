const btnStyle = `
all:unset;
font-family: system-ui, sans-serif;
border: 2px solid #444;
background: white;
color: black;
border-radius: 6px;
padding:2px 6px;
font-size: 14px;
user-select:none;
cursor:pointer;
margin-right: 8px;
`
  .replace(/\n/g, "")
  .trim();

export function injectWS(html, port, file_src, page_path) {
  const helperCode = `
const ppath="${page_path}"
const cont = document.createElement("div");
const btnE = document.createElement("button");
const btnD = document.createElement("button");
const btnN = document.createElement("button");
const btnND = document.createElement("button");
btnE.innerHTML="edit"
btnD.innerHTML="del"
btnN.innerHTML="new page"
btnND.innerHTML="new dir"
//
btnE.setAttribute("style" , "${btnStyle}");
btnD.setAttribute("style" , "${btnStyle}");
btnD.style.backgroundColor="orangered";
btnN.setAttribute("style" , "${btnStyle}");
btnND.setAttribute("style" , "${btnStyle}");
cont.setAttribute("style" , "position:absolute;position: fixed; bottom: 8px ; right: 0px;" + 
"z-index:10000;background-color: transparent;")

cont.appendChild(btnE);
cont.appendChild(btnN);
cont.appendChild(btnND);
cont.appendChild(btnD);
document.body.appendChild(cont);
btnE.addEventListener("click" , ()=>ws.send(JSON.stringify({action:'edit', page: src}))  )
btnD.addEventListener("click" , 
  ()=>{ if(confirm('Are you sure?')){
      ws.send(JSON.stringify({action:'del', page: src , path: ppath})); 
      history.go(-1);
}})
btnN.addEventListener("click" ,
  ()=>{console.log("new")
      let fnm = prompt("Enter filename without extension:");
      if(!fnm) return;
      ws.send(JSON.stringify({action:'new', near: src , fname: fnm})); 
})

btnND.addEventListener("click" ,
  ()=>{console.log("new")
      let fnm = prompt("Enter directory name:");
      if(!fnm) return;
      ws.send(JSON.stringify({action:'dir', near: src , fname: fnm})); 
})
`;
  const code = `<script>
 (()=>{
 const src="${file_src || ""}"
 const ws = new WebSocket("ws://localhost:${port}");
 ws.onmessage = function(event) {
    console.log("Message:", event.data);
    if(event.data==='reload') { location.reload(); }
       else{ alert( event.data );}
   };
 if(src){
 ws.onopen= ()=>{
 console.info("WebSocket connected...")
 ${file_src ? helperCode : "/* nothing to do */"}
}
}
})()
 </script></body></html>`;

  const bodyCloseRegex = /<\/body\>[\s\n]*<\/html\>[\s\n]*$/i; // /<\/body>\s*<\/html>\s*$/i;

  if (bodyCloseRegex.test(html)) {
    return html.replace(bodyCloseRegex, code);
  } else {
    return html + code;
  }
}
