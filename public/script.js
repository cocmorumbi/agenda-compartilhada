const calendarEl = document.getElementById("calendar");
const agendaEl = document.getElementById("agenda");
const pessoaTitulo = document.getElementById("pessoa-titulo");
const mesAtualEl = document.getElementById("mes-atual");

let pessoaSelecionada = null;
let diaSelecionado = null;

// Estado separado por pessoa
const pessoas = {
  Denis: { mesAtual: new Date().getMonth(), anoAtual: new Date().getFullYear() },
  Neuza: { mesAtual: new Date().getMonth(), anoAtual: new Date().getFullYear() },
  Maju: { mesAtual: new Date().getMonth(), anoAtual: new Date().getFullYear() },
  Priscila: { mesAtual: new Date().getMonth(), anoAtual: new Date().getFullYear() },
  Carla: { mesAtual: new Date().getMonth(), anoAtual: new Date().getFullYear() },
};

let compromissosMes = []; // vai guardar os compromissos carregados do mês

// Seleciona a pessoa e renderiza calendário
async function selecionarPessoa(nome, event) {
  pessoaSelecionada = nome;
  pessoaTitulo.innerText = "Agenda de " + nome;

  // Marca botão ativo
  document.querySelectorAll(".sidebar div").forEach(el => el.classList.remove("active"));
  if (event) event.target.classList.add("active");

  // Mostra calendário e navegação
  calendarEl.style.display = "grid";
  document.getElementById("nav-mes").style.display = "flex";

  // Busca compromissos do mês atual
  const { mesAtual, anoAtual } = pessoas[nome];
  await carregarCompromissos(mesAtual + 1, anoAtual);

  renderCalendario();
}

// Carrega todos os compromissos do mês de uma vez
async function carregarCompromissos(mes, ano) {
  try {
    const res = await fetch(`/compromissos?mes=${mes}&ano=${ano}`);
    compromissosMes = await res.json();
  } catch (e) {
    console.error("Erro ao carregar compromissos do mês:", e);
    compromissosMes = [];
  }
}

// Mudar mês
async function mudarMes(delta) {
  if (!pessoaSelecionada) return;
  let p = pessoas[pessoaSelecionada];
  p.mesAtual += delta;
  if (p.mesAtual < 0) { p.mesAtual = 11; p.anoAtual--; }
  if (p.mesAtual > 11) { p.mesAtual = 0; p.anoAtual++; }

  await carregarCompromissos(p.mesAtual + 1, p.anoAtual);
  renderCalendario();
}

// Renderiza o calendário
function renderCalendario() {
  if (!pessoaSelecionada) return;
  const p = pessoas[pessoaSelecionada];
  calendarEl.innerHTML = "";
  agendaEl.innerHTML = "";
  agendaEl.classList.remove("active");

  const hoje = new Date();
  const diasNoMes = new Date(p.anoAtual, p.mesAtual + 1, 0).getDate();
  const primeiroDiaSemana = new Date(p.anoAtual, p.mesAtual, 1).getDay();

  const nomeMes = new Date(p.anoAtual, p.mesAtual)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  mesAtualEl.innerText = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  const fragment = document.createDocumentFragment();

  for (let i = 0; i < primeiroDiaSemana; i++) {
    fragment.appendChild(document.createElement("div"));
  }

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const d = new Date(p.anoAtual, p.mesAtual, dia);
    const div = document.createElement("div");
    div.className = "day";
    div.innerText = dia;
    if (d.toDateString() === hoje.toDateString()) div.classList.add("today");

    const compromissosDia = compromissosMes.filter(c => c.pessoa === pessoaSelecionada && c.dia === dia);
    if (compromissosDia.length > 0) div.classList.add("has-event");
    if (compromissosDia.length >= gerarSlots().length) {
      div.classList.remove("has-event");
      div.classList.add("full");
    }

    div.onclick = () => abrirAgenda(d);
    fragment.appendChild(div);
  }

  calendarEl.appendChild(fragment);
}

// Abrir agenda de um dia específico
function abrirAgenda(data) {
  if (!pessoaSelecionada) return alert("Selecione uma pessoa primeiro");

  diaSelecionado = data;
  const dia = data.getDate();
  const mes = data.getMonth() + 1;
  const ano = data.getFullYear();

  agendaEl.innerHTML = `<h3>${pessoaSelecionada} - ${data.toLocaleDateString("pt-BR")}</h3>`;

  const compromissosDia = compromissosMes.filter(c => c.pessoa === pessoaSelecionada && c.dia === dia);

  gerarSlots().forEach(hora => {
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

// Slots de horário
function gerarSlots() {
  let horarios = [];
  for (let h = 7; h < 17; h++) {
    horarios.push(`${String(h).padStart(2,"0")}:00`);
    horarios.push(`${String(h).padStart(2,"0")}:30`);
  }
  horarios.push("17:00");
  return horarios;
}

// Marcar compromisso
async function marcarCompromisso(pessoa, hora, dia, mes, ano, desc) {
  try {
    await fetch("/compromissos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pessoa, descricao: desc, hora, dia, mes, ano })
    });
    await carregarCompromissos(mes, ano);
    abrirAgenda(new Date(ano, mes-1, dia));
    renderCalendario();
  } catch (e) { console.error(e); }
}

// Cancelar compromisso
async function cancelarCompromisso(pessoa, hora, dia, mes, ano) {
  try {
    await fetch("/compromissos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pessoa, hora, dia, mes, ano })
    });
    await carregarCompromissos(mes, ano);
    abrirAgenda(new Date(ano, mes-1, dia));
    renderCalendario();
  } catch (e) { console.error(e); }
}

// Inicializa com "Hoje"
abrirHoje();

async function abrirHoje() {
  pessoaSelecionada = null;
  pessoaTitulo.innerText = "Compromissos de Hoje";
  calendarEl.style.display = "none";
  agendaEl.innerHTML = `<h3>${new Date().toLocaleDateString("pt-BR")}</h3>`;
  agendaEl.classList.add("active");
  document.getElementById("nav-mes").style.display = "none";
}
