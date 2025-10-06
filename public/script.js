const calendarEl = document.getElementById("calendar");
const agendaEl = document.getElementById("agenda");
const pessoaTitulo = document.getElementById("pessoa-titulo");
const mesAtualEl = document.getElementById("mes-atual");

let pessoaSelecionada = null;
let diaSelecionado = null;
let anoAtual = new Date().getFullYear();
let mesAtual = new Date().getMonth();

// Função ao selecionar pessoa
function selecionarPessoa(nome, event) {
  pessoaSelecionada = nome;
  pessoaTitulo.innerText = "Agenda de " + nome;

  // Mostra o calendário
  calendarEl.style.display = "grid";

  // Marca o botão ativo
  document.querySelectorAll(".sidebar div").forEach(el => el.classList.remove("active"));
  if (event) event.target.classList.add("active");

  // Mostra as setas e nome do mês
  const navMes = document.getElementById("nav-mes");
  if (navMes) navMes.style.display = "flex";

  renderCalendario();
}

// Navegar meses
function mudarMes(delta) {
  mesAtual += delta;
  if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
  if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
  renderCalendario();
}

// Renderiza o calendário
async function renderCalendario() {
  calendarEl.innerHTML = "";
  agendaEl.innerHTML = "";
  agendaEl.classList.remove("active");

  const hoje = new Date();
  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();

  const nomeMes = new Date(anoAtual, mesAtual)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  mesAtualEl.innerText = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  // Espaços vazios antes do primeiro dia
  for (let i = 0; i < primeiroDiaSemana; i++) {
    const vazio = document.createElement("div");
    calendarEl.appendChild(vazio);
  }

  // Dias do mês
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const d = new Date(anoAtual, mesAtual, dia);
    const div = document.createElement("div");
    div.className = "day";
    div.innerText = dia;

    if (d.toDateString() === hoje.toDateString()) div.classList.add("today");

    // Buscar compromissos do dia
    try {
      const res = await fetch(`/compromissos?dia=${dia}&mes=${mesAtual + 1}&ano=${anoAtual}`);
      const dados = await res.json();

      if (dados.length > 0) div.classList.add("has-event");
      if (dados.length >= gerarSlots().length) {
        div.classList.remove("has-event");
        div.classList.add("full");
      }
    } catch (e) {
      console.error("Erro ao buscar compromissos:", e);
    }

    // Clique abre agenda
    div.onclick = () => abrirAgenda(d);
    calendarEl.appendChild(div);
  }
}

// Abrir agenda do dia
async function abrirAgenda(data) {
  if (!pessoaSelecionada) return alert("Selecione uma pessoa primeiro");

  diaSelecionado = data;
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

// Horários disponíveis
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

// Abrir agenda de hoje
async function abrirHoje(event) {
  pessoaSelecionada = null;
  pessoaTitulo.innerText = "Compromissos de Hoje";

  document.querySelectorAll(".sidebar div").forEach(el => el.classList.remove("active"));
  if (event) event.target.classList.add("active");

  calendarEl.style.display = "none";
  const navMes = document.getElementById("nav-mes");
  if (navMes) navMes.style.display = "none";

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

// Inicializa com agenda de hoje
abrirHoje();
