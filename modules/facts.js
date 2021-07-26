const log = require('./log')('facts');


const fs = require('fs');
const path = require('path');

const db = require('./db');


async function rescan() {
	readFiles(path.join(global.__basedir, 'facts'),
		async function(filename, filepath, content) {
			const splittedData = content.split('\n\n');

			const filteredFacts = splittedData.filter(e => e);

			filteredFacts.forEach((fact, index) => {
				filteredFacts[index] = {
					text: filteredFacts[index],
					used: 0,
				};
			});

			filteredFacts.length = 10;

			await db.facts().insertMany(filteredFacts)
				.catch(e => {
					log.error(e);
				});

			fs.unlink(filepath, (e) => {
				log.error(e);
			});

		}, function(err) {
			throw err;
		});
}

async function getRandomFact() {

	const factFound = await db.facts().find().sort({ used: 1 }).limit(1).toArray();

	let fact;
	if(factFound) {
		fact = factFound[0];
	} else {
		return null;
	}

	db.facts().updateOne({ _id: fact._id }, { $inc: { used: 1 } })
		.catch((e) => {
			log.error(e);
		});

	return fact.text;
}

function readFiles(dirname, onFileContent, onError) {
	fs.readdir(dirname, function(err, filenames) {
		if (err) {
			onError(err);
			return;
		}
		filenames.forEach(function(filename) {
			fs.readFile(path.join(dirname, filename), 'utf-8', function(err, content) {
				if (err) {
					onError(err);
					return;
				}
				onFileContent(filename, path.join(dirname, filename), content);
			});
		});
	});
}

module.exports = {
	rescan: rescan,
	getRandomFact: getRandomFact,
};