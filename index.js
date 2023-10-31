var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');

var db = new sqlite3.Database('%HOMEPATH%/Desktop/mensagens.db');
var contactsDb = new sqlite3.Database('%HOMEPATH%/Desktop/contatos.db');

//5518998179468@s.whatsapp.net jid e sort_name
//id 2508, jid 24726
//chat id 2508


const datas = [];

function virouODia(mensagem1, mensagem2, diff) {
  const date1 = new Date(mensagem1.timestamp);
  const date2 = new Date(mensagem2.timestamp);
  //Vacuo maior de 12 horas tambem considero mudança de dia
  // console.log("Tempo demorado:")
  // console.log(diff)
  // if(diff > 5000) {
  //   console.log(date1.toLocaleDateString() + " " + date1.toLocaleTimeString());
  //   // console.log(date1.getHours());
  //   console.log(date2.toLocaleDateString() + " " + date2.toLocaleTimeString());
  // }
  
  if(diff > 3*60*60) {

    if(diff > 24*60*60) {
      return true;
    }
    // console.log("Demora detectada...")
    if(date1.getHours() < 4 || date1.getHours() >= 23) {
      // console.log("Noite detectada")
      return true;
    } else {
      // console.log(date1.toLocaleDateString() + " " + date1.toLocaleTimeString());
      // // console.log(date1.getHours());
      // console.log(date2.toLocaleDateString() + " " + date2.toLocaleTimeString());
      // console.log("Cadastrando uma demora para responder...")
    }
  }


  return false;

}

async function getContacts() {
  return new Promise((resolve, reject) => {
    const jidToName = {};
    contactsDb.serialize(() => {
      contactsDb.all(`SELECT jid, sort_name, phone_label FROM wa_contacts WHERE is_whatsapp_user = 1`, (err, rows) => {
        rows.forEach(row => {
          const {jid, sort_name, phone_label } = row;
          jidToName[jid] = sort_name || phone_label;
        });
        resolve(jidToName);
      }
      );
    });
  });
}

function userPhoneAndIdFromRawJid(contactJid) {
  return new Promise((resolve, reject) => {
    db.serialize(async function () {
    db.all(`SELECT chat._id, jid.user FROM jid, chat WHERE jid.raw_string = '${contactJid}' and jid._id = chat.jid_row_id `, (err, contactRows) => {
      if(contactRows == null || contactRows.length == 0) {
        console.log("Conversa não encontrada!!");
        resolve(null);
        return;
      }
      // console.log(contactRows);
      const chatRowId = contactRows[0]._id;
      const user = contactRows[0].user;
      resolve({user, chatRowId});
    });
    });
    // db.close();
  });
}

function formatarTempo(tempo) {
  if(tempo > 60*60) {
    return Math.ceil(tempo/60/60) + " horas";
  }
  if(tempo > 60*5) {
    return Math.ceil(tempo/60) + " minutos";
  }
  return tempo + " segundos";
}


function getMessages(name, contactJid) {

  return new Promise(async (resolve, reject) => {
    let dadosEu = {
      tempo: 0,
      qtdMensagens: 0,
    }
    let dadosDestinatario = {
      tempo: 0,
      qtdMensagens: 0,
    }

    const user = await userPhoneAndIdFromRawJid(contactJid);
    if(user == null) {
      resolve();
      return;
    }
    const chatRowId = user.chatRowId;
    console.log("Análisando conversas com " + (name || user.user));
    console.log(contactJid);
    // db.serialize(async function () {
      db.all(`SELECT * from message where chat_row_id = ${chatRowId}`, function (err, rows) {
        const data = rows.sort((a, b) => a.timestamp - b.timestamp);
        
        // console.log(chatRowId)
        // console.log("Qtd de mensagens")
        // console.log(data.length)
        if(!rows || rows.length == 0) {
          console.log("Sem mensagens com este contato")
          resolve();
          return;
        }
        let isMeSendingMessage = rows[0].from_me;
        for (let i = 0; i < data.length; i++) {
          const message = rows[i];
          if(i == 0) {
            continue;
          }
          const prevMessage = rows[i-1];
          const tempoResposta = Math.floor((message.timestamp - prevMessage.timestamp) / 1000);

          const recebiRespostaDestinatario = isMeSendingMessage && (message.from_me == false);
          const respondiDestinatario = !isMeSendingMessage && message.from_me == true

          if(recebiRespostaDestinatario || respondiDestinatario) {
            isMeSendingMessage = !isMeSendingMessage;
            const devoPularPoisVirouODia = virouODia(prevMessage, message, tempoResposta);
            if(devoPularPoisVirouODia) {
              continue;
            }
            if(recebiRespostaDestinatario) {
              dadosDestinatario.qtdMensagens++;
              dadosDestinatario.tempo += tempoResposta;
            } else {
              dadosEu.qtdMensagens++;
              // if(tempoResposta > 5000) {
              //   console.log("Cadastrando uma demora para responder...")
              // }
              dadosEu.tempo += tempoResposta;
            }
          }
          // if(isMeSendingMessage && (message.from_me == false)) {
          //   // console.log(`A ultima mensagem minha foi ${prevMessage.text_data || "Alguma midia"} e a resposta dela foi ${message.text_data || "Alguma midia"}`);
          //   if(!virouODia(prevMessage, message, tempoResposta)) {
          //     // console.log("Tempo de resposta: " + tempoResposta + " minutos");
          //     dadosDestinatario.qtdMensagens++;
          //     dadosDestinatario.tempo += tempoResposta;
          //   }

          //   isMeSendingMessage = false;
          // }
          // if(!isMeSendingMessage && message.from_me == true) {
          //   if(!virouODia(prevMessage, message, tempoResposta)) {
          //     // console.log("Tempo de resposta minha: " + tempoResposta + " minutos");
          //     dadosEu.qtdMensagens++;
          //     dadosEu.tempo += tempoResposta;
          //   }
          //   isMeSendingMessage = true;
          // }
        }
        // datas.push(row);
        //console.log('User: ', row);
        // console.log(rows)
        // console.log(tempoDemoradoParaResponder);
        if(dadosEu.tempo == 0) {
          console.log("Pouca conversa para analisar");
          resolve({
            destinatarioTempo: 0,
            qtdMensagens: rows.length
          });
        } else {
          if(dadosDestinatario.qtdMensagens < 70) {
            resolve({
              destinatarioTempo: 0,
              qtdMensagens: rows.length
            });
            return;
          }
          const destinatarioTempo = dadosDestinatario.tempo / dadosDestinatario.qtdMensagens;
          const euTempoMedio = dadosEu.tempo / dadosEu.qtdMensagens
          console.log("Média de tempo de resposta do destinatário = " + formatarTempo(destinatarioTempo));
          console.log("Média de tempo de resposta meu = " + formatarTempo(euTempoMedio));
          resolve(
            {
              destinatarioTempo,
              qtdMensagens: rows.length
            }
          );
        }
      });
    // });
    // db.close();
});
}


getContacts().then(async (e) => {
  const ranking = []
  for (const jid of Object.keys(e)) {
    if(jid.includes("5518996483321")) {
      continue;
    }
    const userData = await getMessages(e[jid], jid);
    if(userData == null) {
      continue;
    }
    const time = Math.floor(userData.destinatarioTempo);
    let finalTime;
    if(Number(time) == time && time != 0) {
      if(jid.includes("g.us")) {
        continue;
      }
      finalTime = time;
      ranking.push({
        qtdMensagens: userData.qtdMensagens,
        nome: e[jid],
        jid: jid,
        tempo: finalTime,
      });
    } else {
      // finalTime = 0;
    }
  }
  const ordenedRanking = ranking.sort((a, b) => a.tempo - b.tempo);
  fs.writeFileSync("./ranking.json", JSON.stringify(ordenedRanking));
  console.log(ordenedRanking);
  // console.log(ranking);
});