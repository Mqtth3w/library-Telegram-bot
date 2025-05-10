# Library Telegram bot [![Awesome](https://cdn.jsdelivr.net/gh/sindresorhus/awesome@d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/Mqtth3w/library-Telegram-bot)

A Telegram bot to handle your personal library.

## How to deploy the bot completely free ([Cloudflare](https://www.cloudflare.com/) based)
It can handle 100k requests for free per day (Cloudflare limits).

<details closed>
<summary><b>Click here to expand the deployment. </b></summary>
  
 The deployment only takes less than 10 minutes.
  
- Create a new bot on telegram with [@BotFather](https://telegram.me/BotFather). Save the api token for future use.
- Create a Cloudflare account.
- Go to workers & pages then create a new worker so deploy it.
- Click edit so replace the code with the content of [lib_tel_bot.js](./lib_tel_bot.js). Deploy it.
- Click configure worker, go to setting, go to variables.
- Add the variable API_KEY (secret type). Which is the bot api token.
- Add the variable SECRET_TOKEN (secret type). Generate its value through the script [gen_token.py](./gen_token.py). You can also type it with your hands (1-256 characters. Only characters `A-Z`, `a-z`, `0-9`, `_` and `-` are allowed). Save it for future use.
- **Optionally** you can add a variable GBOOKS_API_KEY (secret type), which is a Google API key restricted to the Books API service. It let you do more requests, generally you don't need it unless you plan to do thousands of requests per day.
- Encrypt (set the secrect type!) all variables and save.

- ### DB setup
  Follow the instructions in the DB setup [file](./README2.md).

- ### Webhook
  Open the following link after substitution to configure webhook.
  ```
  https://api.telegram.org/bot<replace with your bot api token>/setWebhook?url=<replace with your worker url>&secret_token=<replace with your secret token>
  ```
  You should see something like {"ok":true,"result":true,"description":"Webhook was set"} then the bot works.
  <br><br>
  If you filled wrong info or need to update info you can delete webhook and then you can set it again. Open the following link after substitution to delete webhook.
  ```
  https://api.telegram.org/bot<replace with your bot api token>/deleteWebhook
  ```

</details>

### 🤌 Try it! 



# 📜 User guide 

### 😎 Admin
An admin can also run user commands.
- `/add <ISBN10 or ISBN13> <Optionally the book's title>` adds the book to the DB by taking the data from Google books API or Open Library API. It shows also the added book's data. *A query with also the title has more probability of success*.
-  `/del <ISBN10 or ISBN13>` removes the book from the DB.
-  `/addmanually <isbn10>;<isbn13>;<title>;<authors>;<publisher>;<publishedDate>;<pageCount>;<textSnippet>;<description>;<language>;<location>;<thumbnail (image cover link)>;<price>` adds the book with all the specified data. Don't use ";" in fileds. Leave empty a field if you don't want to specify it (e.g. ;1234567890123;Hello;;;;;;;;room a, library 3;;).
-  `/settitle <ISBN10 or ISBN13> <New book's title>` changes the book's title to the specified.
-  `/setauthors <ISBN10 or ISBN13> <New book's authors>` changes the book's authors to the specified.
-  `/setpublisher <ISBN10 or ISBN13> <New book's publisher>` changes the book's publisher to the specified.
-  `/setdate <ISBN10 or ISBN13> <New book's publishedDate>` changes the book's publishedDate to the specified.
-  `/setpages <ISBN10 or ISBN13> <New book's pageCount>` changes the book's pageCount to the specified.
-  `/setsnippet <ISBN10 or ISBN13> <New book's textSnippet>` changes the book's textSnippet to the specified.
-  `/setdesc <ISBN10 or ISBN13> <New book's description>` changes the book's description to the specified.
-  `/setlang <ISBN10 or ISBN13> <New book's language code>` changes the book's language code (e.g., en, it, ..) to the specified.
-  `/setlocation <ISBN10 or ISBN13> <New book's location>` changes the book's location to the specified.
-  `/setprice <ISBN10 or ISBN13> <New book's price>` changes the book's price to the specified.
-  `/setthumbnail <ISBN10 or ISBN13> <Thumbnail image link>` changes the book's thumbnail to the specified.

### 😊 User
- Send any text message to search for  books by title in DB.
-  `/show <ISBN10 or ISBN13>` shows all the book's data if the book exists in DB.
-  `/count` shows the total number of books in DB.
-  `/pagecount` shows the total number of pages in DB.
-  `/totalvalue` shows the total value (prices' sum) of books in DB.
-  `/help` shows a link to this user guide.
-  `/searchauthor <Author name>` shows books in DB by the author name.
-  `/searchpublisher <Publisher name>` shows books in DB by the publisher name.

### 😭 Others
They can do nothing. If you want everyone able to do read only operations remove the users check ("export default" zone).

# 🛠️ To do 
- Search books by published date.
- Favorites hadling.
- Web interface (mini app).

# 💭 Discussion 
For any comment or to request a new feature you can either use the [Discussions](https://github.com/Mqtth3w/library-Telegram-bot/discussions) section or contact me through the [bot](https://t.me/Mqtth3w_support_bot).

# 🫶 Support 
Donate to support my projects. 
- Crypto & others: Use the command `/support` in the [bot](https://t.me/Mqtth3w_support_bot).
- [Sponsor](https://github.com/sponsors/Mqtth3w).
- [Buy me a pizza](https://buymeacoffee.com/mqtth3w).
- [liberapay](https://liberapay.com/mqtth3w).

# ⭐ Give a Star!
Support this project by giving it a star. Thanks!
