/**
 * @fileoverview This script handle a Telegram bot to manage a library on a cloudflare d1sql db.
 *
 * @author Mqtth3w https://github.com/Mqtth3w/
 * @license GPL-3.0+ https://github.com/Mqtth3w/library-Telegram-bot/blob/main/LICENSE
 *
 */

// userid allowed to run edit commands (an admin is also a user)
const admins = ["123456789"];
//userid allowed to run read-only commands
const users = ["1265456"];

const userGuide = "https://github.com/Mqtth3w/library-Telegram-bot#-user-guide"
const lang = "en"; //SET YOURS
const languages = {
  "it": {
    "start": "Ciao, benvenuto nella biblioteca!",
    "help": "Controlla la guida utente o guarda il menu",
    "libraryClosed": "Mi dispiace, la biblioteca è chiusa e rimarrà chiusa per molto tempo",
    "incorrectUsage": "Uso non corretto, controlla /help",
	"alreadyPresent": "Libro già presente",
    "bookAdded": "Il libro è stato aggiunto",
	"isbnError": "Usa un numero ISBN-10 o ISBN-13",
    "bookDeleted": "Il libro è stato eliminato (se esiste)",
    "bookNotFound": "Il libro non è stato trovato",
	"totbooks": "Libri totali",
	"totbmatched": "Totale libri abbinati",
	"newVal": "Per aggiornare devi fornire un nuovo valore",
	"invalidcmd": "Comando non valido",
	"pageErr": "Numero di pagine non valido, deve essere un numero positivo",
	"update": "Se il libro esiste è stato aggiornato",
	"noBooks": "Nessun libro trovato",
	"bookFound": "Libro trovato",
	"isbn10": "ISBN-10",
	"isbn13": "ISBN-13",
	"title": "Titolo",
	"authors": "Autori",
	"publisher": "Editore",
	"publishedDate": "Data di publicazione",
	"pageCount": "Numero di pagine",
	"textSnippet": "Frammento di testo",
	"description": "Descrizione",
	"language": "Lingua",
	"location": "Posizione",
	"thumbnail": "Immagine miniatura"
  },
  "en": {
    "start": "Hello, welcome to the library!",
    "help": "Check the user guide or look at the menu",
    "libraryClosed": "Sorry, the library is closed, and will stay closed for a long time",
    "incorrectUsage": "Incorrect usage, check /help",
	"alreadyPresent": "Book already present",
    "bookAdded": "The book has been added",
	"isbnError": "Use a ISBN-10 or ISBN-13 number",
    "bookDeleted": "The book has been deleted (if exists)",
    "bookNotFound": "Book not found",
	"totbooks": "Total books",
	"totbmatched": "Total books matched",
	"newVal": "To update you need to provide a new value",
	"invalidcmd": "Invalid command",
	"pageErr": "Invalid page count. It must be a positive number",
	"update": "If the book exists then it has been updated",
	"noBooks": "No books found",
	"bookFound": "Book found",
	"isbn10": "ISBN-10",
	"isbn13": "ISBN-13",
	"title": "Title",
	"authors": "Authors",
	"publisher": "Publisher",
	"publishedDate": "Published date",
	"pageCount": "Page count",
	"textSnippet": "text snippet",
	"description": "Description",
	"language": "Language",
	"location": "Location",
	"thumbnail": "Thumbnail image"
  }
  // You can add other languages here...
};


/** 
 * Handles incoming requests to the Cloudflare Worker.
 * 
 * @param {Request} request - The HTTP request object representing the incoming request.
 * @param {ExecutionContext} env - The environment object containing runtime information, such as bindings.
 * @returns {Promise<Response>} A Promise that resolves to a Response object, which will be returned as the response to the incoming request.
 */
export default {
	async fetch(request, env) {
		const secret_token = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
		if (secret_token !== env.SECRET_TOKEN) {
			return new Response("Authentication Failed.", { status: 403 });
		}
		if (request.method === "POST") {
			const payload = await request.json();
			if ('message' in payload) {
				const chatId = payload.message.chat.id.toString();
				const text = payload.message.text || "";
				const command = text.split(" ")[0];
				const args = text.substring(command.length).trim();
				let edit_command = false;
				if (!users.includes(chatId) && !admins.includes(chatId)) {
					await sendMessage(env, chatId, languages[lang]["libraryClosed"]);
				} else {
					if (admins.includes(chatId)) {
						if (command === "/add") {
							await addBook(env, chatId, args);
							edit_command = true;
						} else if (command === "/del") {
							await deleteBook(env, chatId, args);
							edit_command = true;
						} else if (command === "/addmanually") {
							await addManually(env, chatId, args);
							edit_command = true;
						} else if (command.startsWith("/set")) {
							await updateBook(env, chatId, command, args);
							edit_command = true;
						} 
					} 
					if (users.includes(chatId) || (admins.includes(chatId) && edit_command === false)) { //remove the users check and make this a else if you want to allow to everyone to see your books
						if (command === "/start") await sendMessage(env, chatId, languages[lang]["start"]);
						else if (command === "/help") await sendMessage(env, chatId, `${languages[lang]["help"]} ${userGuide}`);
						else if (command === "/show") await showBook(env, chatId, args);
						else if (command === "/count") await countBooks(env, chatId);
						else if (command === "/searchauthor") await searchBooks(env, chatId, command, args);
						else if (command === "/searchpublisher") await searchBooks(env, chatId, command, args);
						else if (text) await searchBooks(env, chatId, "/searchtitle", text);
						else await sendMessage(env, chatId, languages[lang]["incorrectUsage"]);
					}
				}
			}
		}
    return new Response("OK", { status: 200 });
  },
};

/**
 * Sends a text message to a specified user via a Telegram bot.
 *
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @param {string} text - The message to send.
 * @returns {Promise<void>} - This function does not return a value.
 */
async function sendMessage(env, chatId, text) {
    const url = `https://api.telegram.org/bot${env.API_KEY}/sendMessage`;
    await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text })
    });
}

/** 
 * Search for a book by ISBN through Google books API or Open Library API.
 * 
 * @param {string|Promise<string>} isbn - The book ISBN.
 * @returns {Promise<object|null>} The book data.
 */
async function fetchBookData(isbn) {
    const responseGoogle = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const dataGoogle = await responseGoogle.json();
    if (dataGoogle.items) {
		const bookInfo = dataGoogle.items[0].volumeInfo;
		return {
			isbn10: bookInfo.industryIdentifiers?.find(i => i.type === "ISBN_10")?.identifier || "",
			isbn13: bookInfo.industryIdentifiers?.find(i => i.type === "ISBN_13")?.identifier || "",
			title: bookInfo.title || "",
			authors: bookInfo.authors.join(", ") || "",
			publisher: bookInfo.publisher.join(", ") || "",
			publishedDate: bookInfo.publishedDate || "",
			pageCount: bookInfo.pageCount || "",
			textSnippet: bookInfo.searchInfo?.textSnippet || "",
			description: bookInfo.description || "",
			language: bookInfo.language || "",
			thumbnail: bookInfo.imageLinks?.thumbnail || ""
		};
	}
	
	const responseOpenLibrary = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    const dataOpenLibrary = await responseOpenLibrary.json();
    if (dataOpenLibrary) {
        return {
            isbn10: dataOpenLibrary.isbn_10?.[0] ? dataOpenLibrary.isbn_10?.[0] : "",
            isbn13: dataOpenLibrary.isbn_13?.[0] ? dataOpenLibrary.isbn_13?.[0] : "",
            title: dataOpenLibrary.title || "",
            authors: dataOpenLibrary.authors?.map(a => a.name).join(", ") || "",
            publisher: dataOpenLibrary.publishers?.join(", ") || "",
            publishedDate: dataOpenLibrary.publish_date || "",
            pageCount: dataOpenLibrary.number_of_pages || "",
            textSnippet: "",
            description: "",
            language: dataOpenLibrary.languages?.map(l => l.key.split("/").pop()).join(", ") || "",
            thumbnail: "",
        };
    }
	
	return null;
}

/**
 * Check if an ISBN10 is valid.
 *
 * @param {string} isbn - The ISBN10 to validate.
 * @returns {Promise<boolean>} Resolves with true if valid, false otherwise.
 */
async function isValidISBN10(isbn) {
	return /^[0-9]{9}[0-9X]$/.test(isbn);
}

/**
 * Checks if an ISBN13 is valid.
 *
 * @param {string} isbn - The ISBN13 to validate.
 * @returns {Promise<boolean>} A promise that resolves to true if valid, false otherwise.
 */
async function isValidISBN13(isbn) {
    return /^[0-9]{13}$/.test(isbn);
}

/** 
 * Convert a ISBN10 to ISBN13.
 * 
 * @param {string} isbn10 - The book ISBN10.
 * @returns {Promise<string>} The ISBN13.
 */
async function convertISBN10toISBN13(isbn10) {
    let isbn13Base = "978" + isbn10.slice(0, 9);
    let sum = 0;
    for (let i = 0; i < isbn13Base.length; i++) {
        sum += parseInt(isbn13Base[i]) * (i % 2 === 0 ? 1 : 3);
    }
    let checkDigit = (10 - (sum % 10)) % 10;
    return isbn13Base + checkDigit;
}

/** 
 * Add a book to the DB by ISBN taking its data online.
 * 
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @param {string} isbn - The book ISBN.
 * @returns {Promise<void>} This function does not return a value.
 */
async function addBook(env, chatId, isbn) {
	let finalIsbn10 = (isbn && await isValidISBN10(isbn)) ? isbn : "";
    let finalIsbn13 = (isbn && await isValidISBN13(isbn)) ? isbn : (finalIsbn10 ? await convertISBN10toISBN13(finalIsbn10) : "");
    if (finalIsbn13) {
		const { results } = await env.db.prepare("SELECT * FROM books WHERE isbn13 = ?")
								.bind(finalIsbn13).all();
		if (results.length > 0) {
			let message = `${languages[lang]["alreadyPresent"]}` +
							`${languages[lang]["isbn10"]}: ${results[0].isbn10}\n` +
							`${languages[lang]["isbn13"]}: ${results[0].isbn13}\n` +
							`${languages[lang]["title"]}: ${results[0].title}\n` +
							`${languages[lang]["authors"]}: ${results[0].authors}\n` +
							`${languages[lang]["publisher"]}: ${results[0].publisher}\n` +
							`${languages[lang]["publishedDate"]}: ${results[0].publishedDate}\n\n`;
			await sendMessage(env, chatId, message);
		}
		else {
			const book = await fetchBookData(finalIsbn10 ? isbn : finalIsbn13);
			if (!book) return await sendMessage(env, chatId, `${languages[lang]["bookNotFound"]}`);
			await env.db.prepare("INSERT INTO books VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
				.bind(book.isbn10 || finalIsbn10, book.isbn13 || finalIsbn13, book.title, book.authors, book.publisher, book.publishedDate, 
					book.pageCount, book.textSnippet, book.description, book.language, "", book.thumbnail).run();
			let message = `${languages[lang]["bookAdded"]}\n` + 
					`${languages[lang]["isbn10"]}: ${book.isbn10}\n` +
					`${languages[lang]["isbn13"]}: ${book.isbn13}\n` +
					`${languages[lang]["title"]}: ${book.title}\n` +
					`${languages[lang]["authors"]}: ${book.authors}\n` +
					`${languages[lang]["publisher"]}: ${book.publisher}\n` +
					`${languages[lang]["publishedDate"]}: ${book.publishedDate}\n` +
					`${languages[lang]["pageCount"]}: ${book.pageCount}\n` +
					`${languages[lang]["textSnippet"]}: ${book.textSnippet}\n` + 
					`${languages[lang]["description"]}: ${book.description}\n` +
					`${languages[lang]["language"]}: ${book.language}\n` +
					`${languages[lang]["location"]}: \n` +
					`${languages[lang]["thumbnail"]}: ${book.thumbnail}\n`;
			await sendMessage(env, chatId, message);
		}
	} else await sendMessage(env, chatId, `${languages[lang]["isbnError"]}`);
}

/** 
 * Delete a book by the specified ISBN from the DB.
 * 
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @param {string} isbn - The book ISBN.
 * @returns {Promise<void>} This function does not return a value.
 */
async function deleteBook(env, chatId, isbn) {
    let finalIsbn10 = (isbn && await isValidISBN10(isbn)) ? isbn : "";
    let finalIsbn13 = (isbn && await isValidISBN13(isbn)) ? isbn : (finalIsbn10 ? await convertISBN10toISBN13(finalIsbn10) : "");
    if (finalIsbn13) {
		await env.db.prepare("DELETE FROM books WHERE isbn13 = ?").bind(finalIsbn13).run();
		await sendMessage(env, chatId, `${languages[lang]["bookDeleted"]}`);
	} else await sendMessage(env, chatId, `${languages[lang]["isbnError"]}`);
}

/** 
 * Add a book with the manually inserted data in the DB.
 * 
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @param {string} args - The book data.
 * @returns {Promise<void>} This function does not return a value.
 */
async function addManually(env, chatId, args) {
    const [isbn10, isbn13, title, authors, publisher, publishedDate, pageCount, textSnippet, description, language, location, thumbnail] = args.split(";");
	let finalIsbn10 = (isbn10 && await isValidISBN10(isbn10)) ? isbn10 : "";
    let finalIsbn13 = (isbn13 && await isValidISBN13(isbn13)) ? isbn13 : (finalIsbn10 ? await convertISBN10toISBN13(finalIsbn10) : "");
    if (finalIsbn13) {
		const { results } = await env.db.prepare("SELECT * FROM books WHERE isbn13 = ?")
								.bind(finalIsbn13).all();
		if (results.length > 0) {
			let message = `${languages[lang]["alreadyPresent"]}` +
							`${languages[lang]["isbn10"]}: ${results[0].isbn10}\n` +
							`${languages[lang]["isbn13"]}: ${results[0].isbn13}\n` +
							`${languages[lang]["title"]}: ${results[0].title}\n` +
							`${languages[lang]["authors"]}: ${results[0].authors}\n` +
							`${languages[lang]["publisher"]}: ${results[0].publisher}\n` +
							`${languages[lang]["publishedDate"]}: ${results[0].publishedDate}\n\n`;
			await sendMessage(env, chatId, message);
		} else {
			let pages = Number(pageCount);
			if (isNaN(pages) || pages <= 0) pages = 1;
			await env.db.prepare("INSERT INTO books VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
			.bind(finalIsbn10, finalIsbn13, title || "", authors || "", publisher || "", publishedDate || "", 
				pages, textSnippet || "", description || "", language || "", location || "", thumbnail || "").run();
			await sendMessage(env, chatId, `.`);
		}
	} else await sendMessage(env, chatId, `${languages[lang]["isbnError"]}`);
}

/** 
 * Update a specified filed of a specified book.
 * 
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @param {string} command - The command that indicates the filed to be updated.
 * @param {object} args - The new field of the field.
 * @returns {Promise<void>} This function does not return a value.
 */
async function updateBook(env, chatId, command, args) {
    let [isbn, newValue] = args.split(" ", 2);
    let finalIsbn10 = (isbn && await isValidISBN10(isbn)) ? isbn : "";
    let finalIsbn13 = (isbn && await isValidISBN13(isbn)) ? isbn : (finalIsbn10 ? await convertISBN10toISBN13(finalIsbn10) : "");
    if (finalIsbn13) {
		const fieldMap = {
			"/settitle": "title",
			"/setauthors": "authors",
			"/setpublisher": "publisher",
			"/setdate": "publishedDate",
			"/setpages": "pageCount",
			"/setsnippet": "textSnippet",
			"/setdesc": "description",
			"/setlang": "language",
			"/setlocation": "location",
			"/setthumbnail": "thumbnail"
		};
		if (!fieldMap[command]) {
			return await sendMessage(env, chatId, `${languages[lang]["invalidcmd"]}`);
		}
		if (!newValue) {
			return await sendMessage(env, chatId, `${languages[lang]["newVal"]}`);
		}
		if (command === "/setpages") {
			newValue = Number(newValue);
			if (isNaN(newValue) || newValue <= 0) {
				return await sendMessage(env, chatId, `${languages[lang]["pageErr"]}`);
			}
		}
		await env.db.prepare(`UPDATE books SET ${fieldMap[command]} = ? WHERE isbn13 = ?`)
			.bind(newValue, finalIsbn13).run();
		await sendMessage(env, chatId, `${languages[lang]["update"]}`);
    } else await sendMessage(env, chatId, `${languages[lang]["isbnError"]}`);
}

/** 
 * Search for all books that match the title.
 * 
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @param {string} command - The command that indicates the filed for search.
 * @param {string} data - The data to be searched.
 * @returns {Promise<void>} This function does not return a value.
 */
async function searchBooks(env, chatId, command, data) {
	const fieldMap = {
			"/searchauthor": "authors",
			"/searchpublisher": "publisher",
			"/searchtitle": "title"
		};
    const { results } = await env.db.prepare(`SELECT ISBN10, ISBN13, title, authors, publisher, publishedDate FROM books WHERE ${fieldMap[command]} LIKE ?`)
								.bind(`%${data}%`).all();
    if (results.length === 0) return await sendMessage(env, chatId, `${languages[lang]["noBooks"]}`);
    let total = 0;
	let message = "";
	const batchSize = 25;
	for (let i = 0; i < results.length; i++) {
		const book = results[i];
		total++;
		message += `${languages[lang]["isbn10"]}: ${book.isbn10}\n` +
			`${languages[lang]["isbn13"]}: ${book.isbn13}\n` +
			`${languages[lang]["title"]}: ${book.title}\n` +
			`${languages[lang]["authors"]}: ${book.authors}\n` +
			`${languages[lang]["publisher"]}: ${book.publisher}\n` +
			`${languages[lang]["publishedDate"]}: ${book.publishedDate}\n\n`;
		if ((total % batchSize === 0) || (i === results.length - 1)) {
			if (i === results.length - 1) {
				message += `${languages[lang]["totbmatched"]}: ${total}.`;
			}
			await sendMessage(env, chatId, message);
			await new Promise(resolve => setTimeout(resolve, 30));
			message = ""; 
		}
    }
}

/** 
 * Shows all the data about a specific book found by ISBN.
 * 
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @param {string} isbn - The book ISBN10 or ISBN13.
 * @returns {Promise<void>} This function does not return a value.
 */
async function showBook(env, chatId, isbn) {
	let finalIsbn10 = (isbn && await isValidISBN10(isbn)) ? isbn : "";
    let finalIsbn13 = (isbn && await isValidISBN13(isbn)) ? isbn : (finalIsbn10 ? await convertISBN10toISBN13(finalIsbn10) : "");
    if (finalIsbn13) {
		const { results } = await env.db.prepare("SELECT * FROM books WHERE isbn13 = ?")
									.bind(finalIsbn13).all();
		if (results.length === 0) return await sendMessage(env, chatId, `${languages[lang]["noBooks"]}`);
		let message = "";
		let total = 0;
		const batchSize = 1;
		for (let i = 0; i < results.length; i++) {
			const book = results[i];
			total++;
			message += `${languages[lang]["bookFound"]}\n` + 
					`${languages[lang]["isbn10"]}: ${book.isbn10}\n` +
					`${languages[lang]["isbn13"]}: ${book.isbn13}\n` +
					`${languages[lang]["title"]}: ${book.title}\n` +
					`${languages[lang]["authors"]}: ${book.authors}\n` +
					`${languages[lang]["publisher"]}: ${book.publisher}\n` +
					`${languages[lang]["publishedDate"]}: ${book.publishedDate}\n` +
					`${languages[lang]["pageCount"]}: ${book.pageCount}\n` +
					`${languages[lang]["textSnippet"]}: ${book.textSnippet}\n` + 
					`${languages[lang]["description"]}: ${book.description}\n` +
					`${languages[lang]["language"]}: ${book.language}\n` +
					`${languages[lang]["location"]}: ${book.location}\n` +
					`${languages[lang]["thumbnail"]}: ${book.thumbnail}\n`;
			if ((total % batchSize === 0) || (i === results.length - 1)) {
				await sendMessage(env, chatId, message);
				await new Promise(resolve => setTimeout(resolve, 30));
				message = ""; 
			}
		}
	} else await sendMessage(env, chatId, `${languages[lang]["isbnError"]}`);
}

/** 
 * Count all books in the DB.
 * 
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @returns {Promise<void>} This function does not return a value.
 */
async function countBooks(env, chatId) {
	const { results } = await env.db.prepare(`SELECT COUNT(*) AS tot FROM books`).all();
	await sendMessage(env, chatId, `${languages[lang]["totbooks"]}: ${results[0]["tot"]}.`);
}
