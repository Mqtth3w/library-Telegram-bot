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
const lang = "it"; //SET YOURS
const languages = {
  "it": {
    "start": "Ciao, benvenuto nella biblioteca!",
    "help": "Controlla la guida utente o guarda il menu",
    "libraryClosed": "Mi dispiace, la biblioteca è chiusa e rimarrà chiusa per molto tempo",
    "incorrectUsage": "Uso non corretto, controlla /help",
	"alreadyPresent": "Libro già presente",
    "bookAdded": "Il libro è stato aggiunto",
	"isbnError": "Usa un numero ISBN-10, ISBN-13 o ISSN",
    "bookDeleted": "Il libro è stato eliminato (se esiste)",
    "bookNotFound": "Il libro non è stato trovato",
	"totBooks": "Libri totali",
	"totPrice": "Valore totale",
	"totBmatched": "Totale libri abbinati",
	"newVal": "Per aggiornare devi fornire un nuovo valore",
	"invalidcmd": "Comando non valido",
	"pageErr": "Numero di pagine non valido, deve essere un numero positivo",
	"priceErr": "Prezzo non valido, deve essere un numero maggiore o uguale a zero es: 5.0",
	"update": "Se il libro esiste è stato aggiornato",
	"noBooks": "Nessun libro trovato",
	"bookFound": "Libro trovato",
	"totPages": "Pagine totali",
	"isbn10": "ISBN-10",
	"isbn13": "ISBN-13",
	"issn": "ISSN",
	"title": "Titolo",
	"authors": "Autori",
	"publisher": "Editore",
	"publishedDate": "Data di publicazione",
	"pageCount": "Numero di pagine",
	"textSnippet": "Frammento di testo",
	"description": "Descrizione",
	"language": "Lingua",
	"location": "Posizione",
	"price": "Prezzo",
	"thumbnail": "Immagine miniatura",
	"isFavorite": "Nei preferiti",
	"true": "Si",
	"false": "No",
	"categories": "Categorie"
  },
  "en": {
    "start": "Hello, welcome to the library!",
    "help": "Check the user guide or look at the menu",
    "libraryClosed": "Sorry, the library is closed, and will stay closed for a long time",
    "incorrectUsage": "Incorrect usage, check /help",
	"alreadyPresent": "Book already present",
    "bookAdded": "The book has been added",
	"isbnError": "Use a ISBN-10, ISBN-13 or ISSN number",
    "bookDeleted": "The book has been deleted (if exists)",
    "bookNotFound": "Book not found",
	"totBooks": "Total books",
	"totPrice": "Total value",
	"totBmatched": "Total books matched",
	"newVal": "To update you need to provide a new value",
	"invalidcmd": "Invalid command",
	"pageErr": "Invalid page count. It must be a positive number",
	"priceErr": "Invalid price. It must be greater than or equal to zero ex: 5.0",
	"update": "If the book exists then it has been updated",
	"noBooks": "No books found",
	"bookFound": "Book found",
	"totPages": "Total pages",
	"isbn10": "ISBN-10",
	"isbn13": "ISBN-13",
	"issn": "ISSN",
	"title": "Title",
	"authors": "Authors",
	"publisher": "Publisher",
	"publishedDate": "Published date",
	"pageCount": "Page count",
	"textSnippet": "text snippet",
	"description": "Description",
	"language": "Language",
	"location": "Location",
	"price": "Price",
	"thumbnail": "Thumbnail image",
	"isFavorite": "In favorites",
	"true": "Yes",
	"false": "No",
	"categories": "Categories"
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
						} else if (command.startsWith("/addfav")) {
							await updateBook(env, chatId, command, args);
							edit_command = true;
						} else if (command.startsWith("/delfav")) {
							await updateBook(env, chatId, command, args);
							edit_command = true;
						}
					} 
					if (users.includes(chatId) || (admins.includes(chatId) && edit_command === false)) { //remove the users check and make this a else if you want to allow to everyone to see your books
						if (command === "/start") await sendMessage(env, chatId, languages[lang]["start"]);
						else if (command === "/help") await sendMessage(env, chatId, `${languages[lang]["help"]} ${userGuide}`);
						else if (command === "/show") await showBook(env, chatId, args);
						else if (command === "/count") await countBooks(env, chatId);
						else if (command === "/pagecount") await countPages(env, chatId);
						else if (command === "/totalvalue") await totValue(env, chatId);
						else if (command === "/searchauthor") await searchBooks(env, chatId, command, args);
						else if (command === "/searchpublisher") await searchBooks(env, chatId, command, args);
						else if (command === "/showfav") await searchBooks(env, chatId, command, "true");
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
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {string|Promise<string>} isbn - The book ISBN.
 * @param {string} title - The book's title.
 * @returns {Promise<object|null>} The book data.
 */
async function fetchBookData(env, isbn, title) {
	const url = `https://www.googleapis.com/books/v1/volumes?q=${title ? title + "+" : ""}isbn:${isbn}${env.GBOOKS_API_KEY ? "&key=" + env.GBOOKS_API_KEY : ""}`;
	const responseGoogle = await fetch(url, {
			headers: { "Accept": "application/json" }
		});
	const dataGoogle = await responseGoogle.json();
	if (dataGoogle.items) {
		const bookInfo = dataGoogle.items[0].volumeInfo;
		return {
			isbn10: bookInfo.industryIdentifiers?.find(i => i.type === "ISBN_10")?.identifier || "",
			isbn13: bookInfo.industryIdentifiers?.find(i => i.type === "ISBN_13")?.identifier || "",
			title: bookInfo.title || "",
			authors: bookInfo.authors?.join(", ") || "",
			publisher: bookInfo.publisher || "",
			publishedDate: bookInfo.publishedDate || "",
			pageCount: bookInfo.pageCount || "",
			textSnippet: bookInfo.searchInfo?.textSnippet || "",
			description: bookInfo.description || "",
			language: bookInfo.language || "",
			thumbnail: bookInfo.imageLinks?.thumbnail || "",
			categories: bookInfo.categories?.join(", ") || ""
		};
	}
	// The genius behind OpenLibrary decided it should return an HTML page when a book isn't found.
	const responseOpenLibrary = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, {
			headers: { "Accept": "application/json" }
		});
	const contentType = responseOpenLibrary.headers.get("content-type");
	if (contentType && contentType.includes("application/json")) {	
		const dataOpenLibrary = await responseOpenLibrary.json(); // Ah!
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
				categories: ""
			};
		}
	}
	return null;
}

/**
 * Check if an ISBN-10 is valid.
 *
 * @param {string} isbn - The ISBN-10 to validate.
 * @returns {Promise<boolean>} Resolves with true if valid, false otherwise.
 */
async function isValidISBN10(isbn) {
	if (!/^[0-9]{9}[0-9X]$/.test(isbn)) return false;
	let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += (i + 1) * parseInt(isbn[i]);
    }
    let checksum = isbn[9].toUpperCase();
    sum += checksum === "X" ? 10 * 10 : parseInt(checksum) * 10;
    return sum % 11 === 0;
}

/**
 * Checks if an ISBN-13 is valid.
 *
 * @param {string} isbn - The ISBN-13 to validate.
 * @returns {Promise<boolean>} A promise that resolves to true if valid, false otherwise.
 */
async function isValidISBN13(isbn) {
    if (!/^[0-9]{13}$/.test(isbn)) return false;
	let sum = 0;
    for (let i = 0; i < 12; i++) {
        let digit = parseInt(isbn[i]);
        sum += (i % 2 === 0 ? digit : digit * 3);
    }
    let checksum = (10 - (sum % 10)) % 10;
    return checksum === parseInt(isbn[12]);
}

/**
 * Checks if an ISSN is valid.
 *
 * @param {string} issn - The ISSN to validate.
 * @returns {Promise<boolean>} A promise that resolves to true if valid, false otherwise.
 */
async function isValidISSN(issn) {
    if (!/^[0-9]{8}$/.test(issn)) return false;
	let sum = 0;
	for (let i = 8; i >= 2; i--) {
		sum += Number(issn[8-i]) * i;
	}
	return 11 - sum % 11 == Number(issn[7]);
}

/** 
 * Convert a ISBN-10 to ISBN-13.
 * 
 * @param {string} isbn10 - The book ISBN-10.
 * @returns {Promise<string>} The ISBN-13.
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
 * @param {string} args - The book's ISBN and optionally also the book's title.
 * @returns {Promise<void>} This function does not return a value.
 */
async function addBook(env, chatId, args) {
	const isbn = args.split(" ")[0];
	let finalIsbn10 = (isbn && await isValidISBN10(isbn)) ? isbn : "";
    let finalIsbn13 = (isbn && await isValidISBN13(isbn)) ? isbn : (finalIsbn10 ? await convertISBN10toISBN13(finalIsbn10) : "");
    if (finalIsbn13) {
		const { results } = await env.db.prepare("SELECT * FROM books WHERE isbn13 = ?")
								.bind(finalIsbn13).all();
		if (results.length > 0) {
			let message = `${languages[lang]["alreadyPresent"]}\n` +
							`${languages[lang]["isbn10"]}: ${results[0].isbn10}\n` +
							`${languages[lang]["isbn13"]}: ${results[0].isbn13}\n` +
							`${languages[lang]["issn"]}: ${results[0].issn}\n` +
							`${languages[lang]["title"]}: ${results[0].title}\n` +
							`${languages[lang]["authors"]}: ${results[0].authors}\n` +
							`${languages[lang]["publisher"]}: ${results[0].publisher}\n` +
							`${languages[lang]["publishedDate"]}: ${results[0].publishedDate}\n` +
							`${languages[lang]["categories"]}: ${results[0].categories}\n` +
							`${languages[lang]["isFavorite"]}: ${languages[lang][results[0].isFavorite]}\n\n`;
			await sendMessage(env, chatId, message);
		}
		else {
			const title = args.substring(isbn.length).trim().replace(/\s+/g, "+");
			const book = await fetchBookData(env, finalIsbn10 ? isbn : finalIsbn13, title);
			if (!book) return await sendMessage(env, chatId, `${languages[lang]["bookNotFound"]}`);
			await env.db.prepare("INSERT INTO books VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
				.bind(book.isbn10 || finalIsbn10, book.isbn13 || finalIsbn13, book.title, book.authors, book.publisher, book.publishedDate, 
					book.pageCount, book.textSnippet, book.description, book.language, "", book.thumbnail, 0.0, "", "false", book.categories).run();
			let message = `${languages[lang]["bookAdded"]}\n` + 
					`${languages[lang]["isbn10"]}: ${book.isbn10 || finalIsbn10}\n` +
					`${languages[lang]["isbn13"]}: ${book.isbn13 || finalIsbn13}\n` +
					`${languages[lang]["issn"]}: \n` +
					`${languages[lang]["title"]}: ${book.title}\n` +
					`${languages[lang]["authors"]}: ${book.authors}\n` +
					`${languages[lang]["publisher"]}: ${book.publisher}\n` +
					`${languages[lang]["publishedDate"]}: ${book.publishedDate}\n` +
					`${languages[lang]["categories"]}: ${book.categories}\n` +
					`${languages[lang]["isFavorite"]}: ${languages[lang]["false"]}\n` +
					`${languages[lang]["pageCount"]}: ${book.pageCount}\n` +
					`${languages[lang]["textSnippet"]}: ${book.textSnippet}\n` + 
					`${languages[lang]["description"]}: ${book.description}\n` +
					`${languages[lang]["language"]}: ${book.language}\n` +
					`${languages[lang]["location"]}: \n` +
					`${languages[lang]["price"]}: \n` +
					`${languages[lang]["thumbnail"]}: ${book.thumbnail}\n`;
			await sendMessage(env, chatId, message);
		}
	} else await sendMessage(env, chatId, `${languages[lang]["isbnError"]}`);
}

/** 
 * Delete a book by the specified ISBN/ISSN from the DB.
 * 
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @param {string} code - The book code.
 * @returns {Promise<void>} This function does not return a value.
 */
async function deleteBook(env, chatId, code) {
    let finalIsbn10 = (code && await isValidISBN10(code)) ? code : "";
    let finalIsbn13 = (code && await isValidISBN13(code)) ? code : (finalIsbn10 ? await convertISBN10toISBN13(finalIsbn10) : "");
    if (finalIsbn13 || await isValidISSN(code)) {
		await env.db.prepare("DELETE FROM books WHERE isbn13 = ? OR issn = ?").bind(finalIsbn13, code).run();
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
    const [isbn10, isbn13, title, authors, publisher, publishedDate, pageCount, textSnippet, description, language, location, thumbnail, price, issn, isfav, categories] = args.split(";");
	let finalIsbn10 = (isbn10 && await isValidISBN10(isbn10)) ? isbn10 : "";
    let finalIsbn13 = (isbn13 && await isValidISBN13(isbn13)) ? isbn13 : (finalIsbn10 ? await convertISBN10toISBN13(finalIsbn10) : "");
	if (finalIsbn13 || await isValidISSN(issn)) {
		const { results } = await env.db.prepare("SELECT * FROM books WHERE isbn13 = ? OR issn = ?")
								.bind(finalIsbn13, issn || "-1").all();
		if (results.length > 0) {
			let message = `${languages[lang]["alreadyPresent"]}\n` +
							`${languages[lang]["isbn10"]}: ${results[0].isbn10}\n` +
							`${languages[lang]["isbn13"]}: ${results[0].isbn13}\n` +
							`${languages[lang]["issn"]}: ${results[0].issn}\n` +
							`${languages[lang]["title"]}: ${results[0].title}\n` +
							`${languages[lang]["authors"]}: ${results[0].authors}\n` +
							`${languages[lang]["publisher"]}: ${results[0].publisher}\n` +
							`${languages[lang]["publishedDate"]}: ${results[0].publishedDate}\n` + 
							`${languages[lang]["categories"]}: ${results[0].categories}\n` +
							`${languages[lang]["isFavorite"]}: ${languages[lang][results[0].isFavorite]}\n\n`;
			await sendMessage(env, chatId, message);
		} else {
			let pages = Number(pageCount);
			if (isNaN(pages) || pages <= 0) pages = 1;
			await env.db.prepare("INSERT INTO books VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
			.bind(finalIsbn10, finalIsbn13, title || "", authors || "", publisher || "", publishedDate || "", pages || "", textSnippet || "", 
				description || "", language || "", location || "", thumbnail || "", price || "", issn || "", isfav || "false", categories || "").run();
			await sendMessage(env, chatId, `${languages[lang]["bookAdded"]}`);
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
    let [code, ...newValue] = args.split(" ");
	newValue = newValue.join(" ");
    let finalIsbn10 = (code && await isValidISBN10(code)) ? code : "";
    let finalIsbn13 = (code && await isValidISBN13(code)) ? code : (finalIsbn10 ? await convertISBN10toISBN13(finalIsbn10) : "");
    if (finalIsbn13 || await isValidISSN(code)) {
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
			"/setprice": "price",
			"/setthumbnail": "thumbnail",
			"/addfav": "isFavorite",
			"/delfav": "isFavorite",
			"/setcatgs": "categories"
		};
		if (!fieldMap[command]) {
			return await sendMessage(env, chatId, `${languages[lang]["invalidcmd"]}`);
		}
		if (!newValue && !command.endsWith("fav")) {
			return await sendMessage(env, chatId, `${languages[lang]["newVal"]}`);
		}
		if (command === "/setpages") {
			newValue = Number(newValue);
			if (isNaN(newValue) || newValue <= 0) {
				return await sendMessage(env, chatId, `${languages[lang]["pageErr"]}`);
			}
		} else if (command === "/setprice") {
			newValue = parseFloat(newValue);
			if (isNaN(newValue) || newValue < 0) {
				return await sendMessage(env, chatId, `${languages[lang]["priceErr"]}`);
			}
		} else if (command === "/addfav") {
			newValue = "true";
		} else if (command === "/delfav") {
			newValue = "false";
		}
		await env.db.prepare(`UPDATE books SET ${fieldMap[command]} = ? WHERE isbn13 = ? OR issn = ?`)
			.bind(newValue, finalIsbn13, code).run();
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
			"/searchtitle": "title",
			"/showfav": "isFavorite",
			"/searchcatgs": "categories"
		};
    const { results } = await env.db.prepare(`SELECT isbn10, isbn13, issn, title, authors, publisher, publishedDate, categories, isFavorite FROM books WHERE ${fieldMap[command]} LIKE ?`)
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
			`${languages[lang]["issn"]}: ${book.issn}\n` +
			`${languages[lang]["title"]}: ${book.title}\n` +
			`${languages[lang]["authors"]}: ${book.authors}\n` +
			`${languages[lang]["publisher"]}: ${book.publisher}\n` +
			`${languages[lang]["publishedDate"]}: ${book.publishedDate}\n` +
			`${languages[lang]["publishedDate"]}: ${book.publishedDate}\n` +
			`${languages[lang]["categories"]}: ${book.categories}\n` +
			`${languages[lang]["isFavorite"]}: ${languages[lang][book.isFavorite]}\n\n`;
		if ((total % batchSize === 0) || (i === results.length - 1)) {
			if (i === results.length - 1) {
				message += `${languages[lang]["totBmatched"]}: ${total}`;
			}
			await sendMessage(env, chatId, message);
			await new Promise(resolve => setTimeout(resolve, 30));
			message = ""; 
		}
    }
}

/** 
 * Shows all the data about a specific book found by ISBN/ISSN.
 * 
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @param {string} code - The book ISBN10, ISBN13 or ISSN.
 * @returns {Promise<void>} This function does not return a value.
 */
async function showBook(env, chatId, code) {
	let finalIsbn10 = (code && await isValidISBN10(code)) ? code : "";
    let finalIsbn13 = (code && await isValidISBN13(code)) ? code : (finalIsbn10 ? await convertISBN10toISBN13(finalIsbn10) : "");
    if (finalIsbn13 || await isValidISSN(code)) {
		const { results } = await env.db.prepare("SELECT * FROM books WHERE isbn13 = ? OR issn = ?")
									.bind(finalIsbn13, code).all();
		if (results.length === 0) return await sendMessage(env, chatId, `${languages[lang]["noBooks"]}`);
		let message = `${languages[lang]["bookFound"]}\n` + 
			`${languages[lang]["isbn10"]}: ${results[0].isbn10}\n` +
			`${languages[lang]["isbn13"]}: ${results[0].isbn13}\n` +
			`${languages[lang]["issn"]}: ${results[0].issn}\n` +
			`${languages[lang]["title"]}: ${results[0].title}\n` +
			`${languages[lang]["authors"]}: ${results[0].authors}\n` +
			`${languages[lang]["publisher"]}: ${results[0].publisher}\n` +
			`${languages[lang]["publishedDate"]}: ${results[0].publishedDate}\n` +
			`${languages[lang]["categories"]}: ${results[0].categories}\n` +
			`${languages[lang]["isFavorite"]}: ${languages[lang][results[0].isFavorite]}\n` +
			`${languages[lang]["pageCount"]}: ${results[0].pageCount}\n` +
			`${languages[lang]["textSnippet"]}: ${results[0].textSnippet}\n` + 
			`${languages[lang]["description"]}: ${results[0].description}\n` +
			`${languages[lang]["language"]}: ${results[0].language}\n` +
			`${languages[lang]["location"]}: ${results[0].location}\n` +
			`${languages[lang]["price"]}: ${results[0].price}\n` +
			`${languages[lang]["thumbnail"]}: ${results[0].thumbnail}\n`;
		await sendMessage(env, chatId, message);
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
	await sendMessage(env, chatId, `${languages[lang]["totBooks"]}: ${results[0]["tot"]}`);
}

/** 
 * Count the total number of pages of books in DB.
 * 
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @returns {Promise<void>} This function does not return a value.
 */
async function countPages(env, chatId) {
	const { results } = await env.db.prepare(`SELECT SUM(pageCount) AS tot FROM books`).all();
	await sendMessage(env, chatId, `${languages[lang]["totPages"]}: ${results[0]["tot"]}`);
}

/** 
 * Calculate the total price in DB.
 * 
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @returns {Promise<void>} This function does not return a value.
 */
async function totValue(env, chatId) {
	const { results } = await env.db.prepare(`SELECT SUM(CAST(price AS FLOAT)) AS tot FROM books`).all();
	await sendMessage(env, chatId, `${languages[lang]["totPrice"]}: ${results[0]["tot"]}`);
}