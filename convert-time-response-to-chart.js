const fs = require('fs');


const data = JSON.parse(fs.readFileSync('./ranking.json')).splice(0, 10);

const chartLabels = data.map(e => e.nome);
const chartDate = data.map(e => e.tempo);

const chartJson = {
  type: 'horizontalBar', 
  data: { 
    labels: chartLabels, 
    datasets: [{ 
      label: 'Tempo de resposta ( em segundos )', 
      data: chartDate, 
    }] 
  }
}
const url = encodeURI(`https://quickchart.io/chart?c=${JSON.stringify(chartJson)}`)
console.log(url);