const calendarEl = document.getElementById("calendar");
const agendaEl = document.getElementById("agenda");
const pessoaTitulo = document.getElementById("pessoa-titulo");
const mesAtualEl = document.getElementById("mes-atual");

let pessoaSelecionada = null;
let diaSelecionado = null;
let anoAtual = new Date().getFullYear();
let mesAtual = new Date().getMonth();
let compromissosMes = [];

function selecionarPessoa(nome, event) {
  if (calendarEl) calendarEl.innerHTML = "";

  pessoaSelecionada = nome;
  pessoaTitulo.innerText = "Agenda de " + nome;

  calendarEl.style.display = "grid";

  document.querySelectorAll(".sidebar div").forEach(el => el.classList.remove("active"));
  if (event) event.target.classList.add("active");

  const navMes = document.getElementById("nav-mes");
  if (navMes) navMes.style.display = "flex";

  renderCalendario();
}

function mudarMes(delta) {
  mesAtual += delta;
  if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
  if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
  renderCalendario();
}

let carregandoCalendario = false;

async function renderCalendario() {
  if (carregandoCalendario) return;
  carregandoCalendario = true;

  calendarEl.innerHTML = "<div class='loading'>Carregando...</div>";

  try {
    const res = await fetch(`/compromissos?mes=${mesAtual + 1}&ano=${anoAtual}`);
    compromissosMes = await res.json();
  } catch (e) {
    console.error("Erro ao buscar compromissos do mês:", e);
    compromissosMes = [];
  }

  const hoje = new Date();
  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();

  const nomeMes = new Date(anoAtual, mesAtual)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  mesAtualEl.innerText = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  calendarEl.innerHTML = "";

  for (let i = 0; i < primeiroDiaSemana; i++) {
    const vazio = document.createElement("div");
    calendarEl.appendChild(vazio);
  }

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const d = new Date(anoAtual, mesAtual, dia);
    const div = document.createElement("div");
    div.className = "day";
    div.innerText = dia;

    if (d.toDateString() === hoje.toDateString()) div.classList.add("today");

    const compromissosDia = compromissosMes.filter(
      c => c.dia === dia && (!pessoaSelecionada || c.pessoa === pessoaSelecionada)
    );

    if (compromissosDia.length > 0) {
      div.classList.add("has-event");
      if (compromissosDia.length >= gerarSlots().length) {
        div.classList.remove("has-event");
        div.classList.add("full");
      }
    }

    div.onclick = () => abrirAgenda(new Date(anoAtual, mesAtual, dia));
    calendarEl.appendChild(div);
  }

  carregandoCalendario = false;
}

async function abrirAgenda(dataSelecionada) {
  const dia = dataSelecionada.getDate();
  const mes = dataSelecionada.getMonth() + 1;
  const ano = dataSelecionada.getFullYear();

  diaSelecionado = { dia, mes, ano };

  const agendaEl = document.getElementById("agenda");
  agendaEl.innerHTML = "";

  const dataFormatada = `${dia}/${mes}/${ano}`;
  document.getElementById("pessoa-titulo").innerText =
    pessoaSelecionada ? `${pessoaSelecionada} - ${dataFormatada}` : dataFormatada;

  const horarios = gerarSlots();

  horarios.forEach((hora) => {
    const compromissosHora = compromissosMes.filter(
      (c) =>
        c.dia === dia &&
        c.mes === mes &&
        c.ano === ano &&
        c.hora === hora &&
        (!pessoaSelecionada || c.pessoa === pessoaSelecionada)
    );

    const div = document.createElement("div");
    div.className = "horario";

    // Cabeçalho da hora
    const label = document.createElement("div");
    label.className = "hora-label";
    label.innerText = hora;
    div.appendChild(label);

    // Compromissos empilhados
    const compromissosContainer = document.createElement("div");
    compromissosContainer.className = "compromissos-container";

    compromissosHora.forEach((comp) => {
      const item = document.createElement("div");
      item.className = "compromisso-item";
      item.innerText = `${comp.descricao} (${comp.pessoa})`;

      // botão pra cancelar individualmente
      const btnCancelar = document.createElement("button");
      btnCancelar.className = "cancelar-btn";
      btnCancelar.innerText = "X";
      btnCancelar.onclick = async () => {
        if (confirm("Cancelar este compromisso?")) {
          await fetch("/compromissos", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pessoa: comp.pessoa,
              hora: comp.hora,
              dia: comp.dia,
              mes: comp.mes,
              ano: comp.ano,
            }),
          });
          abrirAgenda(dataSelecionada);
          renderCalendario();
        }
      };

      item.appendChild(btnCancelar);
      compromissosContainer.appendChild(item);
    });

    // botão de adicionar
    const btn = document.createElement("button");
    btn.className = "marcar-btn";
    btn.innerText = "+";
    btn.onclick = () => marcarCompromisso(hora, dia, mes, ano);

    div.appendChild(compromissosContainer);
    div.appendChild(btn);
    agendaEl.appendChild(div);
  });
}

function gerarSlots() {
  let horarios = [];
  for (let h = 7; h < 17; h++) {
    horarios.push(`${String(h).padStart(2, "0")}:00`);
    horarios.push(`${String(h).padStart(2, "0")}:30`);
  }
  horarios.push("17:00");
  return horarios;
}

async function marcarCompromisso(pessoa, hora, dia, mes, ano, desc) {
  try {
    const res = await fetch("/compromissos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pessoa, descricao: desc, hora, dia, mes, ano })
    });

    if (!res.ok) throw new Error(await res.text());

    const resMes = await fetch(`/compromissos?mes=${mes}&ano=${ano}`);
    compromissosMes = await resMes.json();

    abrirAgenda(new Date(ano, mes - 1, dia));
  } catch (e) {
    console.error("Erro ao marcar compromisso:", e);
    alert("Não foi possível salvar o compromisso.");
  }
}

async function cancelarCompromisso(pessoa, hora, dia, mes, ano) {
  try {
    await fetch("/compromissos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pessoa, hora, dia, mes, ano })
    });
    await renderCalendario();
    abrirAgenda(new Date(ano, mes - 1, dia));
  } catch (e) {
    console.error("Erro ao cancelar compromisso:", e);
  }
}

abrirHoje();

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
        const slotDiv = document.createElement("div");
        slotDiv.className = "slot booked";
        slotDiv.innerHTML = `<b>${hora}</b>`;

        compromissosHora.forEach(c => {
          const linha = document.createElement("div");
          linha.className = "booked-item";
          linha.innerText = `${c.pessoa}: ${c.descricao}`;
          slotDiv.appendChild(linha);
        });

        agendaEl.appendChild(slotDiv);
      }
    });
  } catch (e) {
    console.error("Erro ao buscar compromissos de hoje:", e);
  }
}
