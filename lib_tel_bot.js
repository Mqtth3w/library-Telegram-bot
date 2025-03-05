/**
 * @fileoverview This script handle a Telegram bot to manage a library on a cloudflare d1sql db.
 *
 * @author Mqtth3w https://github.com/Mqtth3w/
 * @license GPL-3.0+ https://github.com/Mqtth3w/library-Telegram-bot/blob/main/LICENSE
 *
 */

admins = [123456789];
users = [1265456];

async function sendMessage(env, chatId, text) {
    const url = `https://api.telegram.org/bot${env.API_KEY}/sendMessage`;
    return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text })
    });
}

async function fetchBookData(isbn) {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    const data = await response.json();
    if (!data.items) return null;
    
    const bookInfo = data.items[0].volumeInfo;
    return {
        title: bookInfo.title,
        authors: bookInfo.authors,
        publisher: bookInfo.publisher,
        publishedDate: bookInfo.publishedDate,
        pageCount: bookInfo.pageCount,
        textSnippet: bookInfo.searchInfo?.textSnippet,
        description: bookInfo.description,
        language: bookInfo.language,
        isbn10: bookInfo.industryIdentifiers?.find(i => i.type === "ISBN_10")?.identifier,
        isbn13: bookInfo.industryIdentifiers?.find(i => i.type === "ISBN_13")?.identifier
    };
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
				const args = message.text.substring(command.length).trim();
				if (chatId in admins) {
					if (command === "/add") await addBook(env, chatId, args);
					else if (command === "/del") await deleteBook(env, chatId, args);
					else if (command === "/addmanually") await addManually(env, chatId, args);
					else if (command.startsWith("/set")) await updateBook(env, chatId, command, args);
					else await sendMessage(env, chatId, "Incorrect usage, check /help.");
				} //fix state
				if (chatId in users || chatId in admins) { //remove the users check and make this a else if you want to allow to everyone to see your books
					if (message.text) await searchBooks(env, chatId, message.text);
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


async function addBook(env, chatId, isbn) {
    const book = await fetchBookData(isbn);
    if (!book) return sendMessage(env, chatId, "Libro non trovato.");
    await env.BOOKS.put(isbn, JSON.stringify(book));
    return sendMessage(env, chatId, `Libro aggiunto: ${book.title} di ${book.authors?.join(", ")}`);
}

async function deleteBook(env, chatId, isbn) {
    const book = await env.BOOKS.get(isbn);
    if (!book) return sendMessage(env, chatId, "Libro non trovato.");
    await env.BOOKS.delete(isbn);
    return sendMessage(env, chatId, `Libro eliminato: ${JSON.parse(book).title}`);
}

async function addManually(env, chatId, args) {
    const [isbn10, isbn13, title, authors, publisher, publishedDate, pageCount, textSnippet, description, language, location] = args.split(";");
    if (!isbn10 && !isbn13) return sendMessage(env, chatId, "Devi fornire almeno un ISBN.");
    const book = { isbn10, isbn13, title, authors: authors?.split(","), publisher, publishedDate, pageCount, textSnippet, description, language, location };
    await env.BOOKS.put(isbn13 || isbn10, JSON.stringify(book));
    return sendMessage(env, chatId, `Libro aggiunto manualmente: ${title}`);
}

async function updateBook(env, chatId, command, args) {
    const [isbn, ...newValue] = args.split(" ");
    const bookData = await env.BOOKS.get(isbn);
    if (!bookData) return sendMessage(env, chatId, "Libro non trovato.");
    const book = JSON.parse(bookData);
    
    const fieldMap = {
        "/settitle": "title",
        "/setauthors": "authors",
        "/setpublisher": "publisher",
        "/setdate": "publishedDate",
        "/setpages": "pageCount",
        "/setsnippet": "textSnippet",
        "/setdesc": "description",
        "/setlang": "language",
        "/setlocation": "location"
    };
    
    const field = fieldMap[command];
    if (!field) return sendMessage(env, chatId, "Comando non valido.");
    book[field] = field === "authors" ? newValue.join(" ").split(",") : newValue.join(" ");
    await env.BOOKS.put(isbn, JSON.stringify(book));
    return sendMessage(env, chatId, `Modificato ${field}: ${newValue.join(" ")}`);
}

async function searchBooks(env, chatId, title) {
    const books = await env.BOOKS.list();
    const results = await Promise.all(books.keys.map(async key => JSON.parse(await env.BOOKS.get(key.name))));
    const filtered = results.filter(book => book.title.toLowerCase().includes(title.toLowerCase()));
    
    if (filtered.length === 0) return sendMessage(env, chatId, "Nessun libro trovato.");
    return sendMessage(env, chatId, filtered.map(b => `${b.title} di ${b.authors?.join(", ")}`).join("\n"));
}



