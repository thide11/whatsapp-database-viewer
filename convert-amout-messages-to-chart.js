const fs = require('fs');


const data = JSON.parse(fs.readFileSync('./ranking.json'));

const sortedData = data.sort((a, b) => b.qtdMensagens - a.qtdMensagens).splice(0, 10);

const chartLabels = sortedData.map(e => e.nome);
const chartDate = sortedData.map(e => e.qtdMensagens);

const chartJson = {
  type: 'horizontalBar', 
  data: { 
    labels: chartLabels, 
    datasets: [{ 
      label: 'Qtd de mensagens trocadas', 
      data: chartDate, 
    }] 
  }
}
const url = encodeURI(`https://quickchart.io/chart?c=${JSON.stringify(chartJson)}`)
console.log(url);