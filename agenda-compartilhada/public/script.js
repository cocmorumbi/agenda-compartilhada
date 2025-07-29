const calendarEl = document.getElementById("calendar");
const tableBody = document.getElementById("agenda-table");
let compromissos = {
  "Denis": [],
  "Neuza": [],
  "Maju": [],
  "Priscila": [],
  "Carla": []
};

let diaSelecionado = null;

// 🔄 Trocar abas
function switchTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".content").forEach(c => c.classList.remove("active"));
  document.querySelector(`.tab[onclick*="${tab}"]`).classList.add("active");
  document.getElementById(tab).classList.add("active");

  if (tab === "compromissos") {
    carregarCompromissos(); // carrega do backend
  }
}

// 🗓️ Gera calendário mensal com marcação de compromissos
function gerarCalendario() {
  calendarEl.innerHTML = "";
  const data = new Date();
  const ano = data.getFullYear();
  const mes = data.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay(); // 0 = domingo

  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  // Preenche espaços vazios antes do dia 1
  for (let i = 0; i < primeiroDiaSemana; i++) {
    const vazio = document.createElement("div");
    vazio.className = "day";
    vazio.style.visibility = "hidden";
    calendarEl.appendChild(vazio);
  }

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const div = document.createElement("div");
    div.className = "day";
    div.innerText = dia;
    div.onclick = () => abrirModal(dia);
    const hoje = new Date();
    if (dia === hoje.getDate() && mes === hoje.getMonth()) {
      div.style.border = "2px solid #007bff";
    }


    verificarCompromissos(dia).then(tem => {
      if (tem) div.style.backgroundColor = "#d1ffd1";
    });

    calendarEl.appendChild(div);
  }
}

// Verifica se há compromissos para um dia
async function verificarCompromissos(dia) {
  const data = new Date();
  const mes = data.getMonth() + 1;
  const ano = data.getFullYear();

  const res = await fetch(`http://localhost:3000/compromissos?dia=${dia}&mes=${mes}&ano=${ano}`);
  const dados = await res.json();
  return dados.length > 0;
}

// Abre modal e carrega compromissos do dia
function abrirModal(dia) {
  diaSelecionado = dia;
  document.getElementById("modal").style.display = "block";
}

// Fecha modal
function fecharModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("hora").value = "";
  document.getElementById("descricao").value = "";
}

// Salva compromisso no backend
async function salvarCompromisso() {
  const hora = document.getElementById("hora").value;
  const pessoa = document.getElementById("pessoa").value;
  const desc = document.getElementById("descricao").value;

  if (!hora || !desc) return alert("Preencha tudo!");

  const data = new Date();
  const mes = data.getMonth() + 1;
  const ano = data.getFullYear();

  await fetch("http://localhost:3000/compromissos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pessoa,
      descricao: desc,
      hora,
      dia: diaSelecionado,
      mes,
      ano
    })
  });

  fecharModal();
  gerarCalendario();
  carregarCompromissos();
}

// Carrega compromissos do dia selecionado para a tabela
async function carregarCompromissos() {
  const hoje = new Date();
  const dia = hoje.getDate();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  const res = await fetch(`http://localhost:3000/compromissos?dia=${dia}&mes=${mes}&ano=${ano}`);
  const dados = await res.json();

  // Limpa listas
  Object.keys(compromissos).forEach(p => compromissos[p] = []);

  dados.forEach(c => {
    if (!compromissos[c.pessoa]) compromissos[c.pessoa] = [];
    compromissos[c.pessoa].push({
      hora: c.hora.slice(0, 5),
      desc: c.descricao,
      dia: c.dia
    });
  });

  renderTabela();
}

// Renderiza a tabela diária
function renderTabela() {
  tableBody.innerHTML = "";
  for (let h = 8; h <= 17; h++) {
    const horaFormatada = `${h.toString().padStart(2, '0')}:00`;
    const tr = document.createElement("tr");
    const tdHora = document.createElement("td");
    tdHora.innerText = horaFormatada;
    tr.appendChild(tdHora);

    ["Denis", "Neuza", "Maju", "Priscila", "Carla"].forEach(pessoa => {
      const td = document.createElement("td");
      const compromisso = compromissos[pessoa].find(c => c.hora === horaFormatada);
      td.innerText = compromisso ? compromisso.desc : "";
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  }
}

// Inicializa
gerarCalendario();
