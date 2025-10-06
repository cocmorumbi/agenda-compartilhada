const calendarEl = document.getElementById("calendar");
const agendaEl = document.getElementById("agenda");
const pessoaTitulo = document.getElementById("pessoa-titulo");
const mesAtualEl = document.getElementById("mes-atual");

let pessoaSelecionada = null;
let diaSelecionado = null;

let anoAtual = new Date().getFullYear();
let mesAtual = new Date().getMonth();

// ===============================
// Funções principais
// ===============================

// Seleciona pessoa
function selecionarPessoa(nome) {
  pessoaSelecionada = nome;
  pessoaTitulo.innerText = "Agenda de " + nome;
  calendarEl.style.display = "grid" //mostra o calendario
  document.querySelectorAll(".sidebar div").forEach(el => el.classList.remove("active"));
  event.target.classList.add("active");
  document.getElementById("nav-mes").style.display = "flex";
  renderCalendario();
}

// Troca de mês
function mudarMes(delta) {
  mesAtual += delta;
  if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
  if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
  renderCalendario();
}

// Renderiza calendário
async function renderCalendario() {
  calendarEl.innerHTML = "";
  agendaEl.innerHTML = "";
  agendaEl.classList.remove("active");

  const hoje = new Date();
  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();

  const nomeMes = new Date(anoAtual, mesAtual).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  mesAtualEl.innerText = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  for (let i = 0; i < primeiroDiaSemana; i++) {
    const vazio = document.createElement("div");
    calendarEl.appendChild(vazio);
  }

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const d = new Date(anoAtual, mesAtual, dia);
    const dataKey = d.toISOString().split("T")[0];
    const div = document.createElement("div");
    div.className = "day";
    div.innerText = dia;

    if (d.toDateString() === hoje.toDateString()) div.classList.add("today");

    // Buscar compromissos do dia
    const res = await fetch(`/compromissos?dia=${dia}&mes=${mesAtual+1}&ano=${anoAtual}`);
    const dados = await res.json();

    if (dados.length > 0) {
      div.classList.add("has-event");

      // se estiver cheio (todos os horários)
      if (dados.length >= gerarSlots().length) {
        div.classList.remove("has-event");
        div.classList.add("full");
      }
    }

    div.onclick = () => abrirAgenda(d);
    calendarEl.appendChild(div);
  }
}

// Exibe compromissos de hoje (todos)
async function abrirHoje() {
  pessoaSelecionada = null;
  pessoaTitulo.innerText = "Compromissos de Hoje";
  document.querySelectorAll(".sidebar div").forEach(el => el.classList.remove("active"));
  event.target.classList.add("active");

  calendarEl.style.display = "none";
  document.getElementById("nav-mes").style.display = "none";

  agendaEl.innerHTML = `<h3>${new Date().toLocaleDateString("pt-BR")}</h3>`;
  agendaEl.classList.add("active");

  const dataKey = new Date().toISOString().split("T")[0];
  const hoje = new Date();
  const dia = hoje.getDate();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  const res = await fetch(`/compromissos?dia=${dia}&mes=${mes}&ano=${ano}`);
  const dados = await res.json();

  let slots = gerarSlots();
  slots.forEach(hora => {
    let detalhes = dados
      .filter(c => c.hora === hora)
      .map(c => `${c.pessoa}: ${c.descricao}`);

    if (detalhes.length > 0) {
      let linha = document.createElement("div");
      linha.className = "slot booked";
      linha.innerHTML = `<b>${hora}</b> → ${detalhes.join(" | ")}`;
      agendaEl.appendChild(linha);
    }
  });
}

// Exibe agenda da pessoa em um dia
async function abrirAgenda(data) {
  calendarEl.style.display = "grid" //mostra o calendario
  if (!pessoaSelecionada) return alert("Selecione uma pessoa primeiro");

  diaSelecionado = data;
  const dia = data.getDate();
  const mes = data.getMonth() + 1;
  const ano = data.getFullYear();

  agendaEl.innerHTML = `<h3>${pessoaSelecionada} - ${data.toLocaleDateString("pt-BR")}</h3>`;

  const res = await fetch(`/compromissos?dia=${dia}&mes=${mes}&ano=${ano}`);
  const dados = await res.json();

  const compromissosDia = dados.filter(c => c.pessoa === pessoaSelecionada);

  const slots = gerarSlots();
  slots.forEach(hora => {
    const slotDiv = document.createElement("div");
    slotDiv.className = "slot";
    slotDiv.innerText = hora;

    const comp = compromissosDia.find(c => c.hora === hora);

    if (comp) {
      slotDiv.classList.add("booked");
      slotDiv.innerHTML = `${hora} - ${comp.descricao} 
        <button class="cancel-btn" onclick="cancelarCompromisso('${pessoaSelecionada}','${hora}','${dia}','${mes}','${ano}')">❌</button>`;
    } else {
      slotDiv.onclick = async () => {
        const desc = prompt("Descrição do compromisso:");
        if (desc) await marcarCompromisso(pessoaSelecionada, hora, dia, mes, ano, desc);
      };
    }

    agendaEl.appendChild(slotDiv);
  });

  agendaEl.classList.add("active");
}

// ===============================
// API Calls
// ===============================

// Gera horários
function gerarSlots() {
  let horarios = [];
  for (let h = 7; h < 17; h++) {
    horarios.push(`${String(h).padStart(2, "0")}:00`);
    horarios.push(`${String(h).padStart(2, "0")}:30`);
  }
  horarios.push("17:00");
  return horarios;
}

// Marcar compromisso
async function marcarCompromisso(pessoa, hora, dia, mes, ano, desc) {
  await fetch("/compromissos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pessoa, descricao: desc, hora, dia, mes, ano })
  });
  renderCalendario();
  abrirAgenda(new Date(ano, mes-1, dia));
}

// Cancelar compromisso
async function cancelarCompromisso(pessoa, hora, dia, mes, ano) {
  await fetch("/compromissos", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pessoa, hora, dia, mes, ano })
  });
  renderCalendario();
  abrirAgenda(new Date(ano, mes-1, dia));
}

// ===============================
// Início
// ===============================
abrirHoje();