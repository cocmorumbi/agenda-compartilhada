const calendarEl = document.getElementById("calendar");
const agendaEl = document.getElementById("agenda");
const pessoaTitulo = document.getElementById("pessoa-titulo");
const mesAtualEl = document.getElementById("mes-atual");
const navMes = document.getElementById("nav-mes");

let pessoaSelecionada = null;

// Estado separado por pessoa
let pessoas = {
  Denis: { mesAtual: new Date().getMonth(), anoAtual: new Date().getFullYear() },
  Neuza: { mesAtual: new Date().getMonth(), anoAtual: new Date().getFullYear() },
  Maju: { mesAtual: new Date().getMonth(), anoAtual: new Date().getFullYear() },
  Priscila: { mesAtual: new Date().getMonth(), anoAtual: new Date().getFullYear() },
  Carla: { mesAtual: new Date().getMonth(), anoAtual: new Date().getFullYear() },
};

// Selecionar pessoa
function selecionarPessoa(nome, event) {
  pessoaSelecionada = nome;
  pessoaTitulo.innerText = `Agenda de ${nome}`;

  // Marca o botão ativo
  document.querySelectorAll(".sidebar div").forEach(el => el.classList.remove("active"));
  if (event) event.target.classList.add("active");

  // Mostra calendário e navMes
  calendarEl.style.display = "grid";
  navMes.style.display = "flex";

  renderCalendario();
}

// Mudar mês
function mudarMes(delta) {
  if (!pessoaSelecionada) return;

  let estado = pessoas[pessoaSelecionada];
  estado.mesAtual += delta;
  if (estado.mesAtual < 0) { estado.mesAtual = 11; estado.anoAtual--; }
  if (estado.mesAtual > 11) { estado.mesAtual = 0; estado.anoAtual++; }

  renderCalendario();
}

// Renderizar calendário da pessoa selecionada
async function renderCalendario() {
  if (!pessoaSelecionada) return;

  const estado = pessoas[pessoaSelecionada];
  const mes = estado.mesAtual;
  const ano = estado.anoAtual;

  // Limpar calendar e agenda
  calendarEl.innerHTML = "";
  agendaEl.innerHTML = "";
  agendaEl.classList.remove("active");

  // Nome do mês
  const nomeMes = new Date(ano, mes).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  mesAtualEl.innerText = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  // Dias do mês
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const hoje = new Date();

  // Buscar todos os compromissos do mês da pessoa
  let dadosMes = [];
  try {
    const res = await fetch(`/compromissos?mes=${mes + 1}&ano=${ano}`);
    const todosDados = await res.json();
    // Filtra apenas a pessoa selecionada
    dadosMes = todosDados.filter(c => c.pessoa === pessoaSelecionada);
  } catch (e) {
    console.error("Erro ao buscar compromissos do mês:", e);
  }

  // Espaços vazios antes do primeiro dia
  for (let i = 0; i < primeiroDiaSemana; i++) {
    const vazio = document.createElement("div");
    calendarEl.appendChild(vazio);
  }

  // Dias do mês
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const div = document.createElement("div");
    div.className = "day";
    div.innerText = dia;

    const d = new Date(ano, mes, dia);
    if (d.toDateString() === hoje.toDateString()) div.classList.add("today");

    // Marca se tem evento
    const compromissosDia = dadosMes.filter(c => c.dia === dia);
    if (compromissosDia.length > 0) div.classList.add("has-event");

    div.addEventListener("click", () => abrirAgenda(d));
    calendarEl.appendChild(div);
  }
}

// Abrir agenda de um dia
async function abrirAgenda(data) {
  if (!pessoaSelecionada) return alert("Selecione uma pessoa primeiro");

  const dia = data.getDate();
  const mes = data.getMonth() + 1;
  const ano = data.getFullYear();

  agendaEl.innerHTML = `<h3>${pessoaSelecionada} - ${data.toLocaleDateString("pt-BR")}</h3>`;

  try {
    const res = await fetch(`/compromissos?dia=${dia}&mes=${mes}&ano=${ano}`);
    const dados = await res.json();

    const compromissosDia = dados.filter(c => c.pessoa === pessoaSelecionada);

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
  } catch (e) {
    console.error("Erro ao abrir agenda:", e);
  }
}

// Gerar horários
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
  try {
    await fetch("/compromissos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pessoa, descricao: desc, hora, dia, mes, ano })
    });
    renderCalendario();
    abrirAgenda(new Date(ano, mes - 1, dia));
  } catch (e) {
    console.error("Erro ao marcar compromisso:", e);
  }
}

// Cancelar compromisso
async function cancelarCompromisso(pessoa, hora, dia, mes, ano) {
  try {
    await fetch("/compromissos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pessoa, hora, dia, mes, ano })
    });
    renderCalendario();
    abrirAgenda(new Date(ano, mes - 1, dia));
  } catch (e) {
    console.error("Erro ao cancelar compromisso:", e);
  }
}

// Abrir Hoje
async function abrirHoje(event) {
  pessoaSelecionada = null;
  pessoaTitulo.innerText = "Compromissos de Hoje";

  document.querySelectorAll(".sidebar div").forEach(el => el.classList.remove("active"));
  if (event) event.target.classList.add("active");

  calendarEl.style.display = "none";
  navMes.style.display = "none";

  agendaEl.innerHTML = `<h3>${new Date().toLocaleDateString("pt-BR")}</h3>`;
  agendaEl.classList.add("active");

  const hoje = new Date();
  const dia = hoje.getDate();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  try {
    const res = await fetch(`/compromissos?dia=${dia}&mes=${mes}&ano=${ano}`);
    const dados = await res.json();

    gerarSlots().forEach(hora => {
      const compromissosHora = dados.filter(c => c.hora === hora);
      if (compromissosHora.length > 0) {
        const linha = document.createElement("div");
        linha.className = "slot booked";
        const detalhes = compromissosHora.map(c => `${c.pessoa}: ${c.descricao}`).join(" | ");
        linha.innerHTML = `<b>${hora}</b> → ${detalhes}`;
        agendaEl.appendChild(linha);
      }
    });
  } catch (e) {
    console.error("Erro ao buscar compromissos de hoje:", e);
  }
}

// Inicializa com Hoje
abrirHoje();
