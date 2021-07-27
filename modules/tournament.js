//xnY0ZgISVsqmoeIui4Lc4jefKdKdYwfXKA3BUGy3

const log = require('./log')('tournaments');
const db = require('./db');
const challonge = require('challonge');

// create a new instance of the client
const client = challonge.createClient({
  apiKey: 'xnY0ZgISVsqmoeIui4Lc4jefKdKdYwfXKA3BUGy3',
});


async function create(name) {

}


class Tournament {

    constructor(name) {
        this.name = name;
    }


    async addParticipant(name) {

    }

    // If tournament is in progress mark as inactive and forfeit all matches
    async removeParticipant(name) {

    }

    async getParticipants() {

    }

}

// create a tournament
client.tournaments.create({
  tournament: {
    name: 'new_tournament_name',
    url: 'v598uij6',
    tournamentType: 'single elimination',
  },
  callback: (err, data) => {
    console.log(err, data);
  }
});

client.participants.create({
    id: 'v598uij6',
    participant: {
      name: 'Andrzejoson'
    },
    callback: (err, data) => {
      //console.log(err, data);
    }
});

client.participants.create({
id: 'v598uij6',
participant: {
    name: 'Patrykson'
},
callback: (err, data) => {
    //console.log(err, data);
}
});