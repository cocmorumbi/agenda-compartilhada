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
  
  if (agendaEl) {
    agendaEl.innerHTML = "";
    agendaEl.classList.remove("active");
  }

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
      c => Number(c.dia) === dia && (!pessoaSelecionada || c.pessoa === pessoaSelecionada)
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

async function abrirAgenda(data) {
  if (!pessoaSelecionada) return alert("Selecione uma pessoa primeiro");

  agendaEl.innerHTML = "";
  diaSelecionado = data;
  const dia = data.getDate();
  const mes = data.getMonth() + 1;
  const ano = data.getFullYear();

  agendaEl.innerHTML = `<h3>${pessoaSelecionada} - ${data.toLocaleDateString("pt-BR")}</h3>`;

  const compromissosDia = compromissosMes.filter(c => Number(c.dia) === dia && c.pessoa === pessoaSelecionada);

  gerarSlots().forEach(hora => {
    const slotDiv = document.createElement("div");
    slotDiv.className = "slot";
    
    const horaLabel = document.createElement("b");
    horaLabel.innerText = hora;
    slotDiv.appendChild(horaLabel);

    const compromissosHora = compromissosDia.filter(c => c.hora === hora);

    const containerItens = document.createElement("div");
    containerItens.style.flex = "1";
    containerItens.style.marginLeft = "15px";

    if (compromissosHora.length > 0) {
      slotDiv.classList.add("booked");
      compromissosHora.forEach(c => {
        const compDiv = document.createElement("div");
        compDiv.className = "booked-item";
        compDiv.innerHTML = `
          <span>${c.descricao}</span>
          <div>
            <button class="edit-btn" onclick="editarCompromisso(${c.id}, '${c.descricao.replace(/'/g, "\\'")}', ${c.dia}, ${c.mes}, ${c.ano})" style="background:#f0ad4e; color:white; border:none; border-radius:4px; padding:3px 6px; cursor:pointer; font-size:12px; margin-right:4px;">✏️</button>
            <button class="cancel-btn" onclick="cancelarCompromisso(${c.id}, ${c.dia}, ${c.mes}, ${c.ano})">❌</button>
          </div>
        `;
        containerItens.appendChild(compDiv);
      });
    } else {
      const btnMarcar = document.createElement("button");
      btnMarcar.className = "marcar-btn";
      btnMarcar.innerText = "+ Agendar";
      btnMarcar.onclick = async () => {
        const desc = prompt("Descrição do compromisso interno:");
        if (desc) await marcarCompromisso(pessoaSelecionada, hora, dia, mes, ano, desc);
      };
      containerItens.appendChild(btnMarcar);
    }

    slotDiv.appendChild(containerItens);
    agendaEl.appendChild(slotDiv);
  });

  agendaEl.classList.add("active");
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

async function editarCompromisso(id, descricaoAtual, dia, mes, ano) {
  const novaDescricao = prompt("Editar descrição do compromisso:", descricaoAtual);
  if (novaDescricao === null || novaDescricao.trim() === "") return;

  try {
    const res = await fetch(`/compromissos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descricao: novaDescricao })
    });

    if (!res.ok) throw new Error(await res.text());

    const resMes = await fetch(`/compromissos?mes=${mes}&ano=${ano}`);
    compromissosMes = await resMes.json();

    abrirAgenda(new Date(ano, mes - 1, dia));
  } catch (e) {
    console.error("Erro ao editar compromisso:", e);
    alert("Não foi possível editar o compromisso.");
  }
}

async function cancelarCompromisso(id, dia, mes, ano) {
  try {
    const res = await fetch(`/compromissos/${id}`, {
      method: "DELETE"
    });

    if (!res.ok) throw new Error(await res.text());

    const resMes = await fetch(`/compromissos?mes=${mes}&ano=${ano}`);
    compromissosMes = await resMes.json();

    abrirAgenda(new Date(ano, mes - 1, dia));
  } catch (e) {
    console.error("Erro ao cancelar compromisso:", e);
  }
}

setInterval(() => {
  if (pessoaSelecionada && diaSelecionado) {
    abrirAgenda(diaSelecionado);
  } else {
    abrirHoje();
  }
}, 300000);

abrirHoje();

async function abrirHoje(event) {
  pessoaSelecionada = null;
  pessoaTitulo.innerText = "Compromissos de Hoje";

  document.querySelectorAll(".sidebar div").forEach(el => el.classList.remove("active"));
  if (event) {
    event.target.classList.add("active");
  } else {
    const btnHoje = document.querySelector(".sidebar div:last-child");
    if (btnHoje) btnHoje.classList.add("active");
  }

  calendarEl.style.display = "none";

  const navMes = document.getElementById("nav-mes");
  if (navMes) navMes.style.display = "none";

  // Formata a data atual por extenso (ex: 28 de agosto) e centraliza com tamanho maior
  const hojeObj = new Date();
  const opcoesData = { day: 'numeric', month: 'long' };
  const dataFormatada = hojeObj.toLocaleDateString("pt-BR", opcoesData);
  // Deixa a primeira letra do mês maiúscula
  const dataBonita = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);

  agendaEl.innerHTML = `<h3 style="text-align: center; font-size: 26px; margin-bottom: 20px; color: #3A6604;">${dataBonita}</h3>`;
  agendaEl.classList.add("active");

  const dia = hojeObj.getDate();
  const mes = hojeObj.getMonth() + 1;
  const ano = hojeObj.getFullYear();

  try {
    const res = await fetch(`/compromissos?dia=${dia}&mes=${mes}&ano=${ano}`);
    const dados = await res.json();

    gerarSlots().forEach(hora => {
      const compromissosHora = dados.filter(c => c.hora === hora);
      if (compromissosHora.length > 0) {
        const slotDiv = document.createElement("div");
        slotDiv.className = "slot booked";
        slotDiv.innerHTML = `<b>${hora}</b>`;

        const containerItens = document.createElement("div");
        containerItens.style.flex = "1";
        containerItens.style.marginLeft = "15px";
        containerItens.style.display = "flex";
        containerItens.style.flexDirection = "column";
        containerItens.style.gap = "4px";

        compromissosHora.forEach(c => {
          const linha = document.createElement("div");
          linha.className = "booked-item";
          linha.innerHTML = `<strong>${c.pessoa}:</strong> ${c.descricao}`;
          containerItens.appendChild(linha);
        });

        slotDiv.appendChild(containerItens);
        agendaEl.appendChild(slotDiv);
      }
    });
  } catch (e) {
    console.error("Erro ao buscar compromissos de hoje:", e);
  }
}