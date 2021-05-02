const TelegramBot = require('node-telegram-bot-api');
const token = '1740207614:AAF2p93EsbIozFeRczcCqXGUI1xFt5go14Y';
const sqlite3 = require('sqlite3').verbose();
const { searchAmazon, AmazonSearchResult } = require('unofficial-amazon-search');
var books = require('google-books-search');
const wikipedia = require("@dada513/wikipedia-search");
const itunes = require('itunes-web-api');
const express = require('express');
const bcrypt = require('bcrypt')
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const port = process.env.PORT || 8080;
const ejs = require('ejs');

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: 'secret', saveUninitialized: true, resave: true }));

const bot = new TelegramBot(token, {
    polling: true
});
bot.on("polling_error", (msg) => console.log(msg));
loggato = 0;

function connect() {
    let db = new sqlite3.Database('bookbot.db', (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Connessione al database riuscita');
    })
    return db;
}
let db = connect();

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Benvenuto nel @BookInformation_bot, effettua il login o registrati per effettuare ricerche e per poter salvare i tuoi libri e autori preferiti! ", {
        "reply_markup": {
            "inline_keyboard": [
                [{
                    text: "Login",
                    callback_data: "Login"
                }, {
                    text: "Registrati",
                    callback_data: "Registrati"
                }]
            ]
        }
    });
});

bot.onText(/\/libro/, (msg) => {
    db.get("SELECT * FROM utenti WHERE Loggato=1", (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        if (row === undefined) {
            bot.sendMessage(msg.chat.id, "Per poter compiere quest'operazione devi essere loggato. Prova a loggarti (/login) oppure a registrarti (/registrati) per poter effettuare questa operazione");
        } else {
            bot.sendMessage(msg.chat.id, "Scegli uno dei tre servizi per la ricerca", {
                "reply_markup": {
                    "inline_keyboard": [
                        [{
                            text: "Amazon",
                            callback_data: "LibroAmazon"
                        }, {
                            text: "iTunes",
                            callback_data: "LibroItunes"
                        }, {
                            text: "Google",
                            callback_data: "LibroGoogle"
                        }]
                    ]
                }
            });
        }
    })
});

function Libro(msg) {
    db.get("SELECT * FROM utenti WHERE Loggato=1", (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        if (row === undefined) {
            bot.sendMessage(msg.chat.id, "Per poter compiere quest'operazione devi essere loggato. Prova a loggarti (/login) oppure a registrarti (/registrati) per poter effettuare questa operazione");
        } else {
            bot.sendMessage(msg.chat.id, "Scegli uno dei tre servizi per la ricerca", {
                "reply_markup": {
                    "inline_keyboard": [
                        [{
                            text: "Amazon",
                            callback_data: "LibroAmazon"
                        }, {
                            text: "iTunes",
                            callback_data: "LibroItunes"
                        }, {
                            text: "Google",
                            callback_data: "LibroGoogle"
                        }]
                    ]
                }
            });
        }
    })
}

bot.onText(/\/autori/, (msg) => {
    Autore(msg);
});

bot.onText(/\/libriamazon/, (msg) => {
    RicercaLibri(msg, "amazon");
});

bot.onText(/\/libriitunes/, (msg) => {
    RicercaLibri(msg, "itunes");
});

bot.onText(/\/librigoogle/, (msg) => {
    RicercaLibri(msg, "google");
});

bot.onText(/\/autorewikipedia/, (msg) => {
    RicercaAutore(msg, "wikipedia");
});

bot.onText(/\/autoreitunes/, (msg) => {
    RicercaAutore(msg, "itunes");
});

bot.onText(/\/logout/, (msg) => {
    Logout(msg);
});

bot.onText(/\/login/, (msg) => {
    Login(msg);
});

bot.onText(/\/registrati/, (msg) => {
    LogCheckRegistra(msg);
});

bot.onText(/\/account/, (msg) => {
    db.get("SELECT * FROM utenti WHERE Loggato=1", (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        if (row != undefined) {
            bot.sendMessage(msg.chat.id, "\n\n*Nome:* " + row.Nome + "\n\n*Cognome: *" + row.Cognome + "\n\n*Username: *" + row.Username + "\n\n*Password: *" + row.Password, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(msg.chat.id, "Per poter compiere quest'operazione devi essere loggato. Prova a loggarti (/login) oppure a registrarti (/registrati) per poter effettuare questa operazione");
        }
    })
})

bot.on('callback_query', callbackQuery => {
    var msg = callbackQuery.data;
    var message = callbackQuery.message;
    if (msg == "Login") {
        Login(message)
    } else if (msg == "Registrati") {
        LogCheckRegistra(message);
    } else if (msg == "LibroAmazon") {
        RicercaLibri(message, "amazon");
    } else if (msg == "LibroItunes") {
        RicercaLibri(message, "itunes");
    } else if (msg == "LibroGoogle") {
        RicercaLibri(message, "google");
    } else if (msg == "Libro") {
        Libro(message);
    } else if (msg == "Autore") {
        Autore(message);
    } else if (msg == "AutoreWikipedia") {
        RicercaAutore(message, "wikipedia");
    } else if (msg == "AutoreItunes") {
        RicercaAutore(message, "itunes");
    }
});

async function Registrazione(msg, row) {
    console.log(row);
    if (row === undefined) {
        var utente = await Registrati(msg);
        db.get("SELECT * FROM utenti WHERE Username=?", [utente[2]], async(err, row1) => {
            if (err) {
                return console.error(err.message);
            }
            if (row1 === undefined) {
                let sql_insert = "INSERT INTO utenti(Nome, Cognome, Username, Password, Loggato) VALUES(?,?,?,?,?)";
                db.run(sql_insert, [utente[0], utente[1], utente[2], utente[3], 1], function(err) {
                    if (err) {
                        return console.log(err.message);
                    }
                    console.log("Utente registrato con successo");
                    bot.sendMessage(msg.chat.id, "Utente registrato con successo");
                    Home(msg);
                })
            } else {
                bot.sendMessage(msg.chat.id, "Username già in uso, riprova");
                Registrazione(msg, row);
            }
        })
    } else {
        bot.sendMessage(msg.chat.id, "Sei già loggato, effettua il logout (/logout) prima di poter registrare un nuovo account");
    }
}

function Home(msg) {
    bot.sendMessage(msg.chat.id, "Scegli se ricercare un libro o un autore ", {
        "reply_markup": {
            "inline_keyboard": [
                [{
                    text: "Libro",
                    callback_data: "Libro"
                }, {
                    text: "Autore",
                    callback_data: "Autore"
                }]
            ]
        }
    });
}

async function Registrati(msg) {
    return new Promise((resolve, reject) => {
        var utenti = [];
        bot.sendMessage(msg.chat.id, "Inserisci il tuo nome")
            .then(payload => {
                bot.once('message', (msg) => {
                    utenti.push(msg.text);
                    bot.sendMessage(msg.chat.id, "Inserisci il tuo cognome")
                        .then(payload => {
                            bot.once('message', (msg) => {
                                utenti.push(msg.text);
                                bot.sendMessage(msg.chat.id, "Inserisci il tuo username")
                                    .then(payload => {
                                        bot.once('message', (msg) => {
                                            utenti.push(msg.text);
                                            bot.sendMessage(msg.chat.id, "Inserisci la tua password")
                                                .then(payload => {
                                                    bot.once('message', (msg) => {
                                                        utenti.push(msg.text);
                                                        resolve(utenti);
                                                    });
                                                });
                                        });
                                    });
                            });
                        });
                });
            });
    });
}

function Login(msg) {
    db.get("SELECT * FROM utenti WHERE Loggato=1", async(err, row) => {
        if (err) {
            return console.error(err.message);
        }
        if (row == undefined) {
            var utente = await Loggati(msg);
            db.get("SELECT * FROM utenti WHERE Username=? and Password=?", [utente[0], utente[1]], async(err, row) => {
                if (err) {
                    return console.error(err.message);
                }
                if (row != undefined) {
                    var sql_update = "UPDATE utenti SET Loggato=1 WHERE Username=? AND Password=?";
                    db.run(sql_update, [utente[0], utente[1]], function(err) {
                        if (err) {
                            return console.log(err.message);
                        }
                        console.log("Utente loggato con successo");
                        bot.sendMessage(msg.chat.id, "Utente loggato con successo");
                        Home(msg);
                    })
                } else {
                    bot.sendMessage(msg.chat.id, "Username o password errati, riprova a fare il login (/login)");
                }
            })
        } else {
            bot.sendMessage(msg.chat.id, "Sei già loggato, effettua il logout (/logout) per poter entrare con un altro account");
        }
    })
}
async function Loggati(msg) {
    return new Promise((resolve, reject) => {
        var utenti = [];
        bot.sendMessage(msg.chat.id, "Inserisci il tuo username")
            .then(payload => {
                bot.once('message', (msg) => {
                    utenti.push(msg.text);
                    bot.sendMessage(msg.chat.id, "Inserisci la tua password")
                        .then(payload => {
                            bot.once('message', (msg) => {
                                utenti.push(msg.text);
                                resolve(utenti);
                            });
                        });
                });
            });
    });

}

function RicercaLibri(message, tipo) {
    db.get("SELECT * FROM utenti WHERE Loggato=1", (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        if (row == undefined) {
            bot.sendMessage(message.chat.id, "Per poter compiere quest'operazione devi essere loggato. Prova a loggarti (/login) oppure a registrarti (/registrati) per poter effettuare questa operazione");
        } else {
            bot.sendMessage(message.chat.id, "Inserisci il titolo di un libro")
                .then(payload => {
                    bot.once('message', (msg) => {
                        if (tipo == "google") {
                            search_Google(msg);
                            bot.sendMessage(msg.chat.id, "Scelta: Google!");
                        } else if (tipo == "amazon") {
                            search_Amazon(msg);
                            bot.sendMessage(msg.chat.id, "Scelta: Amazon!");
                        } else if (tipo == "itunes") {
                            search_iTunes(msg);
                            bot.sendMessage(msg.chat.id, "Scelta: iTunes!");
                        }
                    });
                });
        }
    });
}

function Autore(msg) {
    db.get("SELECT * FROM utenti WHERE Loggato=1", (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        if (row === undefined) {
            bot.sendMessage(msg.chat.id, "Per poter compiere quest'operazione devi essere loggato. Prova a loggarti (/login) oppure a registrarti (/registrati) per poter effettuare questa operazione");
        } else {
            bot.sendMessage(msg.chat.id, "Scegli uno dei tre servizi per la ricerca", {
                "reply_markup": {
                    "inline_keyboard": [
                        [{
                            text: "iTunes",
                            callback_data: "AutoreItunes"
                        }, {
                            text: "Wikipedia",
                            callback_data: "AutoreWikipedia"
                        }]
                    ]
                }
            });
        }
    })
}

function RicercaAutore(message, tipo) {
    db.get("SELECT * FROM utenti WHERE Loggato=1", (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        if (row == undefined) {
            bot.sendMessage(message.chat.id, "Per poter compiere quest'operazione devi essere loggato. Prova a loggarti (/login) oppure a registrarti (/registrati) per poter effettuare questa operazione");
        } else {
            bot.sendMessage(message.chat.id, "Inserisci il nome e cognome di un autore")
                .then(payload => {
                    bot.once('message', (msg) => {
                        if (tipo == "wikipedia") {
                            search_autore_wikipedia(msg);
                            bot.sendMessage(msg.chat.id, "Scelta: Wikipedia!");
                        } else if (tipo == "itunes") {
                            search_autore_itunes(msg);
                            bot.sendMessage(msg.chat.id, "Scelta: iTunes!");
                        }
                    });
                });
        }
    });
}

async function search_autore_wikipedia(msg) {
    try {
        const res = await wikipedia.search(msg.text, "it");
        bot.sendMessage(msg.chat.id, "*Nome e cognome:* " + res[0].title + "\n\n[Clicca qui per vedere la pagina completa](" + res[0].url + ")", { parse_mode: 'Markdown' });
        console.log(res);
        bot.sendMessage(msg.chat.id, "Vuoi renderlo uno dei tuoi preferiti? Scrivi SI oppure NO!")
            .then(payload => {
                bot.once('message', (msg) => {
                    if (msg.text == "Si" || msg.text == "si") {
                        AutorePreferito(res, msg, "wikipedia");
                    } else {
                        bot.sendMessage(msg.chat.id, "Autore non aggiunto ai preferiti");
                    }
                })
            })
    } catch (e) {
        bot.sendMessage(msg.chat.id, "C'è stato un errore con la ricerca, riprova (/autorewikipedia) oppure (/autori)");
    }
}

async function search_autore_itunes(msg) {
    try {
        let data = await itunes.artist(msg.text, { limit: 1, lang: 'it', country: 'IT' })
        bot.sendMessage(msg.chat.id, "*Nome e cognome:* " + data.results[0].artistName + "\n\n*Genere preferito:* " + data.results[0].primaryGenreName + "\n\n[Clicca qui per vedere la pagina completa](" + data.results[0].artistLinkUrl + ")", { parse_mode: 'Markdown' });
        bot.sendMessage(msg.chat.id, "Vuoi renderlo uno dei tuoi preferiti? Scrivi SI oppure NO!")
            .then(payload => {
                bot.once('message', (msg) => {
                    if (msg.text == "Si" || msg.text == "si") {
                        AutorePreferito(data, msg, "itunes");
                    } else {
                        bot.sendMessage(msg.chat.id, "Autore non aggiunto ai preferiti");
                    }
                })
            })
    } catch (e) {
        bot.sendMessage(msg.chat.id, "C'è stato un errore con la ricerca, riprova (/autoreitunes) oppure (/autori)");
    }
}

function AutorePreferito(data, msg, tipo) {
    db.get("SELECT * FROM utenti WHERE Loggato=1", function(err, row) {
        if (err) {
            return console.log(err.message);
        }
        if (row != undefined) {
            let sql_insert = "INSERT INTO autori(Nome, GenerePreferito, Link, Tipo, Fk_IdUtente) VALUES(?,?,?,?,?)";
            if (tipo == "itunes") {
                db.run(sql_insert, [data.results[0].artistName, data.results[0].primaryGenreName, data.results[0].artistLinkUrl, tipo, row.IdUtente], function(err) {
                    if (err) {
                        return console.log(err.message);
                    }
                    console.log("Autore preferito aggiunto con successo");
                    bot.sendMessage(msg.chat.id, "Autore preferito aggiunto con successo, [Clicca qui per poter vedere tutti i tuoi libri e autori preferiti](https://bookbot-telegram.herokuapp.com/)", { parse_mode: 'Markdown' });
                })
            } else {
                db.run(sql_insert, [data[0].title, null, data[0].url, tipo, row.IdUtente], function(err) {
                    if (err) {
                        return console.log(err.message);
                    }
                    console.log("Autore preferito aggiunto con successo");
                    bot.sendMessage(msg.chat.id, "Autore preferito aggiunto con successo, [Clicca qui per poter vedere tutti i tuoi libri e autori preferiti](https://bookbot-telegram.herokuapp.com/)", { parse_mode: 'Markdown' });
                })
            }
        } else {
            bot.sendMessage(msg.chat.id, "Per poter compiere quest'operazione devi essere loggato. Prova a loggarti (/login) oppure a registrarti (/registrati) per poter effettuare questa operazione");
        }
    })
}

function search_Google(msg) {
    books.search(msg.text, function(error, results) {
        if (error) {
            bot.sendMessage(msg.chat.id, "C'è stato un errore con la ricerca, riprova (/librigoogle) oppure (/libro)");
        } else {
            try {
                bot.sendMessage(msg.chat.id, "*Titolo:* " + results[0].title + "\n\n*Autore:* " + results[0].authors[0] + "\n\n*Anno pubblicazione:* " + results[0].publishedDate + "\n\n[Clicca qui per vedere il libro](" + results[0].link + ")", { parse_mode: 'Markdown' });
                bot.sendMessage(msg.chat.id, "Vuoi renderlo uno dei tuoi preferiti? Scrivi SI oppure NO!")
                    .then(payload => {
                        bot.once('message', (msg) => {
                            if (msg.text == "Si" || msg.text == "si" || msg.text == "SI") {
                                LibroPreferito(results, msg, "google");
                            } else {
                                bot.sendMessage(msg.chat.id, "Libro non aggiunto ai preferiti");
                            }
                        })
                    })
            } catch (e) {
                bot.sendMessage(msg.chat.id, "C'è stato un errore con la ricerca, riprova (/librigoogle) oppure (/libro)");
            }
        }
    });
}

async function search_Amazon(msg) {
    let datAmazon = await searchAmazon(msg.text);
    console.log(datAmazon.searchResults[0]);
    try {
        bot.sendPhoto(msg.chat.id, datAmazon.searchResults[0].imageUrl, { caption: "*Titolo:* " + datAmazon.searchResults[0].title + "\n\n⭐ *Valutazione:* " + datAmazon.searchResults[0].rating.score + "/" + datAmazon.searchResults[0].rating.outOf + "\n\n*💶 Prezzo:* €" + datAmazon.searchResults[0].prices[0].price + "\n\n[Clicca qui per comprare il libro](https://www.amazon.it" + datAmazon.searchResults[0].productUrl + ")", parse_mode: 'Markdown' });
        bot.sendMessage(msg.chat.id, "Vuoi renderlo uno dei tuoi preferiti? Scrivi SI oppure NO!")
            .then(payload => {
                bot.once('message', (msg) => {
                    if (msg.text == "Si" || msg.text == "si") {
                        LibroPreferito(datAmazon, msg, "amazon");
                    } else {
                        bot.sendMessage(msg.chat.id, "Libro non aggiunto ai preferiti");
                    }
                })
            })
    } catch (e) {
        bot.sendMessage(msg.chat.id, "C'è stato un errore con la ricerca, riprova (/libriamazon) oppure (/libro)");
    }
}

async function search_iTunes(msg) {
    try {
        let data = await itunes.book(msg.text, { limit: 1, lang: 'it', country: 'IT' });
        i = 0;
        let generi = "";
        console.log(data.results[0]);
        while (i < data.results[0].genres.length) {
            generi = generi + data.results[0].genres[i] + ", ";
            i++;
        }
        bot.sendMessage(msg.chat.id, "*Titolo:* " + data.results[0].trackName + "\n\n*Autore:* " + data.results[0].artistName + "\n\n*💶 Prezzo: *" + data.results[0].formattedPrice + "\n\n*Tipo: *" + data.results[0].kind + "\n\n*Breve descrizione:* " + data.results[0].description + "\n\n*Generi:* " + generi + "\n\n[Clicca qui per vedere il libro](" + data.results[0].trackViewUrl + ")", { parse_mode: 'Markdown' });
        bot.sendMessage(msg.chat.id, "Vuoi renderlo uno dei tuoi preferiti? Scrivi SI oppure NO!")
            .then(payload => {
                bot.once('message', (msg) => {
                    if (msg.text == "Si" || msg.text == "si") {
                        LibroPreferito(data, msg, "itunes");
                    } else {
                        bot.sendMessage(msg.chat.id, "Libro non aggiunto ai preferiti");
                    }
                })
            })
    } catch (e) {
        bot.sendMessage(msg.chat.id, "C'è stato un errore con la ricerca, riprova (/libriitunes) oppure (/libro)");
    }
}

function LibroPreferito(data, msg, tipo) {
    db.get("SELECT * FROM utenti WHERE Loggato=1", function(err, row) {
        if (err) {
            return console.log(err.message);
        }
        if (row != undefined) {
            let sql_insert = "INSERT INTO libri(Titolo, Descrizione, RicercatoCon, Valutazione, Autore, Link, Fk_IdUtente) VALUES(?,?,?,?,?,?,?)";
            if (tipo == "itunes") {
                db.run(sql_insert, [data.results[0].trackName, data.results[0].description, tipo, null, data.results[0].artistName, data.results[0].trackViewUrl, row.IdUtente], function(err) {
                    if (err) {
                        return console.log(err.message);
                    }
                    console.log("Libro preferito aggiunto con successo");
                    bot.sendMessage(msg.chat.id, "Libro preferito aggiunto con successo, [Clicca qui per poter vedere tutti i tuoi libri e autori preferiti](https://bookbot-telegram.herokuapp.com/)", { parse_mode: 'Markdown' });
                })
            } else if (tipo == "amazon") {
                let link = "https://www.amazon.it" + data.searchResults[0].productUrl;
                db.run(sql_insert, [data.searchResults[0].title, null, tipo, data.searchResults[0].rating.score, null, link, row.IdUtente], function(err) {
                    if (err) {
                        return console.log(err.message);
                    }
                    console.log("Libro preferito aggiunto con successo");
                    bot.sendMessage(msg.chat.id, "Libro preferito aggiunto con successo, [Clicca qui per poter vedere tutti i tuoi libri e autori preferiti](https://bookbot-telegram.herokuapp.com/)", { parse_mode: 'Markdown' });
                })
            } else if (tipo == "google") {
                db.run(sql_insert, [data[0].title, null, tipo, null, data[0].authors[0], data[0].link, row.IdUtente], function(err) {
                    if (err) {
                        return console.log(err.message);
                    }
                    console.log("Libro preferito aggiunto con successo");
                    bot.sendMessage(msg.chat.id, "Libro preferito aggiunto con successo, [Clicca qui per poter vedere tutti i tuoi libri e autori preferiti](https://bookbot-telegram.herokuapp.com/)", { parse_mode: 'Markdown' });
                })
            }
        } else {
            bot.sendMessage(msg.chat.id, "Per poter compiere quest'operazione devi essere loggato. Prova a loggarti (/login) oppure a registrarti (/registrati) per poter effettuare questa operazione");
        }
    })
}



function LogCheckRegistra(msg) {
    db.get("SELECT * FROM utenti WHERE Loggato=1", (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        Registrazione(msg, row);
    })
}

function Logout(msg) {
    db.get("SELECT * FROM utenti WHERE Loggato=1", (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        if (row == undefined) {
            bot.sendMessage(msg.chat.id, "Non hai fatto l'accesso quindi come fai a fare il logout?");
        } else {
            db.run("UPDATE utenti SET Loggato=0 WHERE IdUtente=" + row.IdUtente, (err, row1) => {
                if (err) {
                    return console.error(err.message);
                }
                bot.sendMessage(msg.chat.id, "Logout effettuato con successo");
            })
        }
    })
}

app.use(express.static(__dirname + '/views'));

app.listen(port, () => console.log('Attivo sulla porta ' + port));

app.get("/", async function(req, res) {
    res.render("index", { utente: req.session });
});

app.get("/login", function(req, res) {
    let get_calciatori = [];
    db.all("SELECT * FROM utenti", (err, rows) => {
        if (err) {
            throw err;
        }
        rows.forEach(function(row) {
            get_calciatori.push(row);
        });

        if (req.session != "undefined") {
            res.render("login", { utente: req.session });
        }
    });
});

app.post("/login", async(req, res) => {
    try {
        db.get("SELECT * FROM utenti WHERE Username = ?", [req.body.Username], (err, row) => {
            if (err) {
                throw err;
            }
            console.log(req.body.Username);
            try {
                if (row != undefined) {
                    if (row.Password == req.body.Password) {
                        req.session.IdUtente = row.IdUtente;
                        req.session.Username = req.body.Username;
                        req.session.NomeCognome = row.Nome + " " + row.Cognome;
                        console.log("Login effettuato");
                        res.redirect('/');
                    } else {
                        console.log("Password errata");
                        res.redirect('/login');
                    }
                } else {
                    console.log("Account non esistente");
                    res.redirect('/login');
                }
            } catch (e) {
                console.log("Errore nel login");
                res.redirect('/login');
            }
        });
    } catch (e) {
        console.log("Errore nel login");
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(function(err) {
        if (err) {
            throw err;
        }
        res.redirect('/login');
    });
});

app.get("/libri", async function(req, res) {
    let libripreferiti = [];
    db.all("SELECT * FROM libri WHERE Fk_IdUtente=?", [req.session.IdUtente], (err, rows) => {
        if (err) {
            throw err;
        }
        rows.forEach(function(row) {
            libripreferiti.push(row);
        });
        res.render("libri", { libri: libripreferiti, utente: req.session });
    });
});
app.get("/rimuovilibro", async function(req, res) {
    let libripreferiti = [];
    db.run("DELETE FROM libri WHERE IdLibro=? ", [req.query.IdLibro], (err, rows) => {
        if (err) {
            throw err;
        }
        db.all("SELECT * FROM libri WHERE Fk_IdUtente=?", [req.session.IdUtente], (err, rows) => {
            if (err) {
                throw err;
            }
            rows.forEach(function(row) {
                libripreferiti.push(row);
            });
            res.render("libri", { libri: libripreferiti, utente: req.session });
        });
    });
});

app.get("/autori", async function(req, res) {
    let autoripreferiti = [];
    db.all("SELECT * FROM autori WHERE Fk_IdUtente=?", [req.session.IdUtente], (err, rows) => {
        if (err) {
            throw err;
        }
        rows.forEach(function(row) {
            autoripreferiti.push(row);
        });
        res.render("autori", { autori: autoripreferiti, utente: req.session });
    });
});

app.get("/rimuoviautore", async function(req, res) {
    let autoripreferiti = [];
    db.run("DELETE FROM autori WHERE IdAutore=? ", [req.query.IdAutore], (err, rows) => {
        if (err) {
            throw err;
        }
        db.all("SELECT * FROM autori WHERE Fk_IdUtente=?", [req.session.IdUtente], (err, rows) => {
            if (err) {
                throw err;
            }
            rows.forEach(function(row) {
                autoripreferiti.push(row);
            });
            res.render("autori", { autori: autoripreferiti, utente: req.session });
        });
    });
});