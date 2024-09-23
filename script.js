// new things:
// using state to toggle notepad section and note section
// create ticket(keydown,dynamaclly )
// textarea.value = '' (this is done to access or alter textarea value)
// note preference color(how we use for each to select particular element inside div work as element.target/current target)
// alert property
// how to write dynamic code
//how to select element of dynamic code(see handle removal comment )& how to get data of particuar element without foreach
//contennteditable property inside handle lock property
//findindex property
//

let addbtn = document.querySelector(".add");
let removebtn = document.querySelector(".remove");
let note_container = document.querySelector(".note_container");
let header = document.querySelector(".header");
let Allpref = document.querySelectorAll(".pref");
let note = document.querySelector(".note");
let text = document.querySelector(".text");
let filtercolor = document.querySelectorAll(".color");

let state = false; //for add button to show and remove note container
let ticketPriotyClr = "black";
let noteText = ""; //default note text
let removeBtnStatus = false; //remove btn
let prefcolor = ["pink", "green", "blue", "black"];
let len = prefcolor.length;

/// note preference color

Allpref.forEach(function (elem) {
  elem.addEventListener("click", function () {
    Allpref.forEach(function (removeclr) {
      removeclr.classList.remove("active");
    });
    elem.classList.add("active");
    ticketPriotyClr = elem.classList[1];
  });
});

///add button
addbtn.addEventListener("click", function () {
  state = !state; //the exclemenation mark toggle the state

  if (state == true) {
    note_container.style.display = "grid";
    note.style.display = "none";
  } else {
    note_container.style.display = "none";
    note.style.display = "grid";
  }
});

///remove btn
removebtn.addEventListener("click", function () {
  alert("remove button activated");
  removeBtnStatus = !removeBtnStatus;
  if (removeBtnStatus == true) {
    removebtn.style.backgroundColor = "red";
  } else {
    removebtn.style.backgroundColor = "";
  }
});

/// creating ticket
note_container.addEventListener("keydown", function (e) {
  let key = e.key;
  if (key == "Shift") {
    noteText = text.value; //note text extraction
    createTic(ticketPriotyClr, noteText, shortid());
    note_container.style.display = "none";
    note.style.display = "grid";
    text.value = "";
  }
});

function createTic(ticketClr, noteTexts, noteid) {
  let createTicket = document.createElement("div");
  createTicket.setAttribute("class", "notes");
  createTicket.innerHTML = `
    <div class="priotyclr ${ticketClr}"></div>
    <div class="note_id">${noteid}</div>
    <div class="write_notes" contenteditable="false">${noteTexts}</div>
    <i class="fa-solid fa-lock" id="lock"></i>`;

  note.appendChild(createTicket);

  handleRemove(createTicket);
  handleLock(createTicket);
  handlePriotyclr(createTicket);
}

// /handle removal

function handleRemove(ticket) {
  ticket.addEventListener("click", function () {
    if (removeBtnStatus == true) {
      ticket.remove();
    } else {
      console.log("lock buton off");
    }
  });
}

///handle lock
function handleLock(lock) {
  let lockun = lock.querySelector("#lock");
  let edit = lock.querySelector(".write_notes");
  lockun.addEventListener("click", function () {
    if (lockun.classList.contains("fa-lock")) {
      lockun.classList.remove("fa-lock");
      lockun.classList.add("fa-unlock");
      edit.setAttribute("contenteditable", "true");
    } else {
      lockun.classList.add("fa-lock");
      lockun.classList.remove("fa-unlock");
      edit.setAttribute("contenteditable", "false");
    }
  });
}

///handle prioty color
function handlePriotyclr(clr) {
  let colour = clr.querySelector(".priotyclr");
  colour.addEventListener("click", function () {
    let currclr = colour.classList[1];
    let clrIdx = prefcolor.findIndex(function (e) {
      return currclr === e;
    });

    console.log(clrIdx);
    let nextClr = prefcolor[(clrIdx + 1) % len];
    colour.classList.remove(currclr);
    colour.classList.add(nextClr);
  });
}

///filter colour
filtercolor.forEach(function (e) {
  e.addEventListener("click", function () {
    let currentclr = e.classList[1];
    let listClr = document.querySelectorAll(".priotyclr");
    listClr.forEach(function (clr) {
        if (currentclr != clr.classList[1]) {
            clr.parentElement.style.display = 'none';
            
        } else {
            clr.parentElement.style.display = 'block';
      };
    });
  });
    e.addEventListener("dblclick", function () {
        let currentclr = e.classList[1];
        let listClr = document.querySelectorAll(".priotyclr");
        listClr.forEach(function (clr) {
            clr.parentElement.style.display = 'block';
        });
    })
});
