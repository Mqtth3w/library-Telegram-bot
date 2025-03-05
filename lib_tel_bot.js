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
 * Search for a book through ISBN and Google books API.
 * 
 * @param {string} isbn - The book ISBN.
 * @returns {Promise<object|null>} The book data.
 */
async function fetchBookData(isbn) {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const data = await response.json();
    if (!data.items) return null;
    const bookInfo = data.items[0].volumeInfo;
    return {
		isbn10: bookInfo.industryIdentifiers?.find(i => i.type === "ISBN_10")?.identifier || "",
        isbn13: bookInfo.industryIdentifiers?.find(i => i.type === "ISBN_13")?.identifier || "",
        title: bookInfo.title || "",
        authors: bookInfo.authors.join(", ") || "",
        publisher: bookInfo.publisher || "",
        publishedDate: bookInfo.publishedDate || "",
        pageCount: bookInfo.pageCount || "",
        textSnippet: bookInfo.searchInfo?.textSnippet || "",
        description: bookInfo.description || "",
        language: bookInfo.language || "",
        thumbnail: bookInfo.imageLinks?.thumbnail || ""
    };
}

/** 
 * convert a ISBN10 to ISBN13.
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
	if (isbn && Number(isbn) > 0 && (isbn.length === 10 || isbn.length === 13)) {
		const book = await fetchBookData(isbn);
		if (!book) return await sendMessage(env, chatId, `Book ${isbn} not found.`);
		await env.db.prepare("INSERT INTO books VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
			.bind(book.isbn10, book.isbn13, book.title, book.authors, book.publisher, book.publishedDate, 
				book.pageCount, book.textSnippet, book.description, book.language, "", book.thumbnail).run();
		let message = `The following book has been found and added\n` +
				`ISBN10: ${book.isbn10}\n` +
				`ISBN13: ${book.isbn13}\n` +
				`title: ${book.title}\n` +
				`authors: ${book.authors}\n` +
				`publisher: ${book.publisher}\n` +
				`publishedDate: ${book.publishedDate}\n` +
				`pageCount: ${book.pageCount}\n` +
				`textSnippet: ${book.textSnippet}\n` + 
				`description: ${book.description}\n` +
				`language: ${book.language}\n` +
				`location: \n` +
				`thumbnail: ${book.thumbnail}\n`;
		await sendMessage(env, chatId, message);
	}
	else await sendMessage(env, chatId, "Use a ISBN10 or ISBN13 number.");
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
    if (isbn && Number(isbn) > 0 && (isbn.length === 10 || isbn.length === 13)) {
		await env.db.prepare(`DELETE FROM books WHERE ${isbn.length === 10 ? "isbn10" : "isbn13"} = ? LIMIT 1`).bind(isbn).run();
		await sendMessage(env, chatId, `Book ${isbn} deleted (if exists).`);
	}
	else await sendMessage(env, chatId, "Use a ISBN10 or ISBN13 number.");
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
    if ((isbn10 && Number(isbn10) > 0 && isbn10.length === 10) || (isbn13 && Number(isbn13) > 0 && isbn13.length === 10)) {
		let pages = Number(pageCount);
		if (isNaN(pages) || pages <= 0) pages = 1;
		await env.db.prepare("INSERT INTO books VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
		.bind(isbn10 || "", isbn13 || convertISBN10toISBN13(isbn10), title || "", authors || "", publisher || "", publishedDate || "", 
			pages, textSnippet || "", description || "", language || "", location || "", thumbnail || "").run();
		await sendMessage(env, chatId, `Book ISBN10 ${isbn10}, ISBN13 ${isbn13} added.`);
	} else await sendMessage(env, chatId, "You must provide a valid ISBN10 or ISBN13.");
}

/** 
 * Update a specified filed of a specified book.
 * 
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @param {string} command - Indicate the filed to be updated.
 * @param {object} args - The new field of the field.
 * @returns {Promise<void>} This function does not return a value.
 */
async function updateBook(env, chatId, command, args) {
    let [isbn, newValue] = args.split(" ", 2);
    if (isbn && Number(isbn) > 0 && (isbn.length === 10 || isbn.length === 13) && newValue) {
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
		if (command === "/setpages") {
			newValue = Number(newValue);
			if (isNaN(newValue) || newValue <= 0) {
				return await sendMessage(env, chatId, "Invalid page count. It must be a positive number.");
			}
		}
		await env.db.prepare(`UPDATE books SET ${fieldMap[command]} = ? WHERE ${isbn.length === 10 ? "isbn10" : "isbn13"} = ? LIMIT 1`)
			.bind(newValue, isbn).run();
		await sendMessage(env, chatId, "If the book exists then it has been updated.");
    }
	else await sendMessage(env, chatId, "You must provide a valid ISBN10 or ISBN13, and a new value.");
}

/** 
 * Search for all books that match the title.
 * 
 * @param {object} env - The environment object containing runtime information, such as bindings.
 * @param {number|string} chatId - The chat ID of the user who requested the service.
 * @param {number|string} title - The book's title to search.
 * @returns {Promise<void>} This function does not return a value.
 */
async function searchBooks(env, chatId, title) {
    const { results } = await env.db.prepare("SELECT ISBN10, ISBN13, title, authors, publisher, publishedDate FROM books WHERE title LIKE ?")
								.bind(`%${title}%`).all();
    if (results.length === 0) return await sendMessage(env, chatId, `No title contains ${title}.`);
    let total = 0;
	let message = "";
	const batchSize = 25;
	for (let i = 0; i < results.length; i++) {
		const book = results[i];
		total++;
		message += `ISBN10: ${book.isbn10}\n` +
			`ISBN13: ${book.isbn13}\n` +
            `title: ${book.title}\n` +
            `authors: ${book.authors}\n` +
            `publisher: ${book.publisher}\n` +
            `publishedDate: ${book.publishedDate}\n\n`;
		if ((total % batchSize === 0) || (i === results.length - 1)) {
			if (i === results.length - 1) {
				message += `total books matched: ${total}.`;
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
	if (isbn && Number(isbn) > 0 && (isbn.length === 10 || isbn.length === 13)) {
		const { results } = await env.db.prepare(`SELECT * FROM books WHERE ${isbn.length === 10 ? "isbn10" : "isbn13"} = ?`)
									.bind(isbn).all();
		if (results.length === 0) return await sendMessage(env, chatId, `No books found with ${isbn.length === 10 ? "ISBN10" : "ISBN13"} ${isbn}.`);
		let message = "";
		let total = 0;
		const batchSize = 1;
		for (let i = 0; i < results.length; i++) {
			const book = results[i];
			total++;
			message += `The following book has been found\n` +
				`ISBN10: ${book.isbn10}\n` +
				`ISBN13: ${book.isbn13}\n` +
				`title: ${book.title}\n` +
				`authors: ${book.authors}\n` +
				`publisher: ${book.publisher}\n` +
				`publishedDate: ${book.publishedDate}\n` +
				`pageCount: ${book.pageCount}\n` +
				`textSnippet: ${book.textSnippet}\n` + 
				`description: ${book.description}\n` +
				`language: ${book.language}\n` +
				`location: ${book.location}\n` +
				`thumbnail: ${book.thumbnail}\n`;
			if ((total % batchSize === 0) || (i === results.length - 1)) {
				await sendMessage(env, chatId, message);
				await new Promise(resolve => setTimeout(resolve, 30));
				message = ""; 
			}
		}
	} else await sendMessage(env, chatId, "You must provide a valid ISBN10 or ISBN13.");
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
	await sendMessage(env, chatId, `Total books: ${results[0]["tot"]}.`);
}

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
					if (command === "/start") await sendMessage(env, chatId, "Hello, welcome to the library!");
					else if (command === "/help") await sendMessage(env, chatId, `Check the user guide or look at the menu. ${userGuide}`);
					else if (command === "/show") await showBook(env, chatId, args);
					else if (command === "/count") await countBooks(env, chatId);
					else if (text) await searchBooks(env, chatId, text);
					else await sendMessage(env, chatId, "Incorrect usage, check /help.");
				}
				else {
					await sendMessage(env, chatId, "Sorry, the library is closed, and will stay closed for a long time.");
				}
			}
		}
    return new Response("OK", { status: 200 });
  },
};